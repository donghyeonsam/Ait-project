package com.aitserver.user.service;

import com.aitserver.community.entity.Post;
import com.aitserver.community.entity.PostLikeScrap;
import com.aitserver.community.repository.PostLikeScrapRepository;
import com.aitserver.community.repository.PostRepository;
import com.aitserver.user.dto.MyPagePostResponse;
import com.aitserver.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MyPagePostService {

    private final UserRepository userRepository;
    private final PostRepository postRepository;
    private final PostLikeScrapRepository postLikeScrapRepository;

    public Page<MyPagePostResponse> getMyPagePosts(Pageable pageable, Long userId) {

        Page<Post> response = postRepository.findByUserId(userId, pageable);

        return response.map(
                MyPagePostResponse::from
        );
    }

    public Page<MyPagePostResponse> getMyScrappedPosts(Pageable pageable,Long userId) {
        Page<Post> posts = postLikeScrapRepository.findAllByUserAction(
                userId,
                PostLikeScrap.ActionType.SCRAP,
                pageable
        );

        return posts.map(MyPagePostResponse::from);
    }


    public Page<MyPagePostResponse> getMyLikedPosts(Pageable pageable,Long userId) {
        Page<Post> posts = postLikeScrapRepository.findAllByUserAction(
                userId,
                PostLikeScrap.ActionType.LIKE,
                pageable
        );

        return posts.map(MyPagePostResponse::from);
    }



}
