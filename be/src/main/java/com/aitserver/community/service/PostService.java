package com.aitserver.community.service;

import com.aitserver.auth.entity.User;
import com.aitserver.auth.repository.UserRepository;
import com.aitserver.community.dto.PostDto;
import com.aitserver.community.entity.Post;
import com.aitserver.community.entity.PostFile;
import com.aitserver.community.entity.PostTag;
import com.aitserver.community.entity.Tag;
import com.aitserver.community.repository.PostFileRepository;
import com.aitserver.community.repository.PostRepository;
import com.aitserver.community.repository.PostTagRepository;
import com.aitserver.community.repository.TagRepository;
import com.aitserver.global.exception.BusinessException;
import com.aitserver.global.exception.ErrorCode;
import com.aitserver.global.file.FileStorageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PostService {

    private final PostRepository postRepository;
    private final PostTagRepository postTagRepository;
    private final PostFileRepository postFileRepository;
    private final TagRepository tagRepository;
    private final UserRepository userRepository;
    private final FileStorageService fileStorageService;
    /**
     * 1. 게시글 생성
     */
    @Transactional
    public Long createPost(Long userId, PostDto.CreateRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.NO_USER));

        Post post = Post.builder()
                .user(user)
                .category(request.getCategory())
                .title(request.getTitle())
                .content(request.getContent())
                .allowComments(request.getAllowComments())
                .receiveNotifications(request.getReceiveNotifications())
                .build();

        Post savedPost = postRepository.save(post);

        if (request.getTags() != null && !request.getTags().isEmpty()) {
            saveTags(savedPost, request.getTags());
        }

        if (request.getFiles() != null && !request.getFiles().isEmpty()) {
            for (PostDto.FileRequest fileReq : request.getFiles()) {
                PostFile postFile = PostFile.builder()
                        .post(savedPost)
                        .originalFilename(fileReq.getOriginalFilename())
                        .storedFilename(fileReq.getStoredFilename())
                        .fileType(fileReq.getFileType())
                        .usageType(fileReq.getUsageType())
                        .build();
                postFileRepository.save(postFile);
            }
        }

        return savedPost.getId();
    }

    /**
     * 2. 게시글 수정
     */
    @Transactional
    public void updatePost(Long userId, Long postId, PostDto.UpdateRequest request) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(ErrorCode.POST_NOT_FOUND));

        if (!post.getUser().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED_POST_ACTION);
        }

        post.update(
                request.getTitle(),
                request.getContent(),
                request.getCategory(),
                request.getAllowComments(),
                request.getReceiveNotifications()
        );

        if (request.getTags() != null) {
            updatePostTags(post, request.getTags());
        }

        if (request.getFiles() != null) {
            updatePostFiles(post, request.getFiles());
        }
    }

    /**
     * 3. 게시글 삭제 (소프트 딜리트)
     */
    @Transactional
    public void deletePost(Long userId, Long postId) {
        Post post = postRepository.findById(postId)
                .orElseThrow(() -> new BusinessException(ErrorCode.POST_NOT_FOUND));

        if (!post.getUser().getId().equals(userId)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED_POST_ACTION);
        }

        post.softDelete();
    }

    // --- 내부 private 메서드 분리 (태그 처리용) ---

    private void saveTags(Post post, List<String> tagNames) {
        for (String tagName : tagNames) {
            Tag tag = tagRepository.findByName(tagName)
                    .orElseGet(() -> tagRepository.save(Tag.builder().name(tagName).build()));
            postTagRepository.save(PostTag.builder().post(post).tag(tag).build());
        }
    }

    private void updatePostTags(Post post, List<String> requestedTagNames) {
        List<PostTag> existingPostTags = postTagRepository.findByPostId(post.getId());
        List<String> existingTagNames = existingPostTags.stream()
                .map(pt -> pt.getTag().getName())
                .toList();

        List<PostTag> tagsToRemove = existingPostTags.stream()
                .filter(pt -> !requestedTagNames.contains(pt.getTag().getName()))
                .toList();

        List<String> tagNamesToAdd = requestedTagNames.stream()
                .filter(name -> !existingTagNames.contains(name))
                .toList();

        if (!tagsToRemove.isEmpty()) {
            postTagRepository.deleteAll(tagsToRemove);
        }

        saveTags(post, tagNamesToAdd);
    }

    private void updatePostFiles(Post post, List<PostDto.FileRequest> requestedFiles) {
        // 1. 기존 게시글의 파일 목록 가져오기
        List<PostFile> existingFiles = postFileRepository.findByPostId(post.getId());

        // 비교를 위해 기존 파일들의 저장된 이름(storedFilename) 추출
        List<String> existingStoredFilenames = existingFiles.stream()
                .map(PostFile::getStoredFilename)
                .toList();

        // 비교를 위해 요청된 파일들의 저장된 이름 추출
        List<String> requestedStoredFilenames = requestedFiles.stream()
                .map(PostDto.FileRequest::getStoredFilename)
                .toList();

        // 2. 삭제할 파일 찾기 (기존에는 있는데 요청에는 없는 것)
        List<PostFile> filesToRemove = existingFiles.stream()
                .filter(file -> !requestedStoredFilenames.contains(file.getStoredFilename()))
                .toList();

        // 3. 추가할 파일 찾기 (요청에는 있는데 기존에는 없는 것)
        List<PostDto.FileRequest> filesToAdd = requestedFiles.stream()
                .filter(req -> !existingStoredFilenames.contains(req.getStoredFilename()))
                .toList();

        // 4. DB 반영
        // 4-1. 없어진 파일 DB에서 삭제
        if (!filesToRemove.isEmpty()) {
            postFileRepository.deleteAll(filesToRemove); // 1. DB 레코드 삭제

            for (PostFile file : filesToRemove) {
                fileStorageService.deleteFile(file.getStoredFilename()); // 2. 물리적 파일 삭제
            }
        }

        // 4-2. 새로 추가된 파일 DB에 저장
        for (PostDto.FileRequest req : filesToAdd) {
            PostFile newFile = PostFile.builder()
                    .post(post)
                    .originalFilename(req.getOriginalFilename())
                    .storedFilename(req.getStoredFilename())
                    .fileType(req.getFileType())
                    .usageType(req.getUsageType())
                    .build();
            postFileRepository.save(newFile);
        }
    }
}