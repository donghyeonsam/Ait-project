package com.aitserver.community.service;

import com.aitserver.community.dto.CommentDto;
import com.aitserver.community.entity.Post;
import com.aitserver.community.entity.PostComment;
import com.aitserver.community.repository.CommentLikeRepository;
import com.aitserver.community.repository.PostCommentRepository;
import com.aitserver.community.repository.PostRepository;
import com.aitserver.notification.entity.NotificationType;
import com.aitserver.notification.event.NotificationEvent;
import com.aitserver.user.entity.User;
import com.aitserver.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CommentServiceTest {

    @Mock
    private PostCommentRepository commentRepository;
    @Mock
    private PostRepository postRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CommentLikeRepository commentLikeRepository;
    @Mock
    private ApplicationEventPublisher eventPublisher;

    private CommentService commentService;

    @BeforeEach
    void setUp() {
        commentService = new CommentService(
                commentRepository,
                postRepository,
                userRepository,
                commentLikeRepository,
                eventPublisher
        );
        when(commentRepository.save(any(PostComment.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void commentNotifiesPostAuthor() {
        User postAuthor = user(1L);
        User commentAuthor = user(2L);
        Post post = post(100L, postAuthor);
        CommentDto.CreateRequest request = request(null);

        when(postRepository.findById(100L)).thenReturn(Optional.of(post));
        when(userRepository.findById(2L)).thenReturn(Optional.of(commentAuthor));

        commentService.createComment(2L, 100L, request);

        NotificationEvent event = publishedEvent();
        assertThat(event.receiverId()).isEqualTo(1L);
        assertThat(event.type()).isEqualTo(NotificationType.COMMENT);
        assertThat(event.targetId()).isEqualTo(100L);
    }

    @Test
    void replyNotifiesOnlyParentCommentAuthor() {
        User postAuthor = user(1L);
        User replyAuthor = user(2L);
        User parentAuthor = user(3L);
        Post post = post(100L, postAuthor);
        PostComment parent = parentComment(parentAuthor);
        CommentDto.CreateRequest request = request(10L);

        when(postRepository.findById(100L)).thenReturn(Optional.of(post));
        when(userRepository.findById(2L)).thenReturn(Optional.of(replyAuthor));
        when(commentRepository.findById(10L)).thenReturn(Optional.of(parent));

        commentService.createComment(2L, 100L, request);

        NotificationEvent event = publishedEvent();
        assertThat(event.receiverId()).isEqualTo(3L);
        assertThat(event.type()).isEqualTo(NotificationType.REPLY);
        assertThat(event.targetId()).isEqualTo(100L);
    }

    @Test
    void replyStillNotifiesParentAuthorWhenTheyOwnThePost() {
        User postAndParentAuthor = user(1L);
        User replyAuthor = user(2L);
        Post post = post(100L, postAndParentAuthor);
        PostComment parent = parentComment(postAndParentAuthor);
        CommentDto.CreateRequest request = request(10L);

        when(postRepository.findById(100L)).thenReturn(Optional.of(post));
        when(userRepository.findById(2L)).thenReturn(Optional.of(replyAuthor));
        when(commentRepository.findById(10L)).thenReturn(Optional.of(parent));

        commentService.createComment(2L, 100L, request);

        NotificationEvent event = publishedEvent();
        assertThat(event.receiverId()).isEqualTo(1L);
        assertThat(event.type()).isEqualTo(NotificationType.REPLY);
    }

    @Test
    void selfReplyDoesNotCreateNotification() {
        User postAuthor = user(1L);
        User commentAuthor = user(2L);
        Post post = post(100L, postAuthor);
        PostComment parent = parentComment(commentAuthor);
        CommentDto.CreateRequest request = request(10L);

        when(postRepository.findById(100L)).thenReturn(Optional.of(post));
        when(userRepository.findById(2L)).thenReturn(Optional.of(commentAuthor));
        when(commentRepository.findById(10L)).thenReturn(Optional.of(parent));

        commentService.createComment(2L, 100L, request);

        verify(eventPublisher, never()).publishEvent(any());
    }

    private NotificationEvent publishedEvent() {
        ArgumentCaptor<NotificationEvent> captor = ArgumentCaptor.forClass(NotificationEvent.class);
        verify(eventPublisher).publishEvent(captor.capture());
        return captor.getValue();
    }

    private CommentDto.CreateRequest request(Long parentId) {
        CommentDto.CreateRequest request = new CommentDto.CreateRequest();
        request.setParentId(parentId);
        request.setContent("내용");
        return request;
    }

    private User user(Long id) {
        User user = org.mockito.Mockito.mock(User.class);
        lenient().when(user.getId()).thenReturn(id);
        return user;
    }

    private Post post(Long id, User author) {
        Post post = org.mockito.Mockito.mock(Post.class);
        lenient().when(post.getId()).thenReturn(id);
        lenient().when(post.getUser()).thenReturn(author);
        lenient().when(post.getAllowComments()).thenReturn(true);
        lenient().when(post.getReceiveNotifications()).thenReturn(true);
        lenient().when(post.getTitle()).thenReturn("게시글");
        return post;
    }

    private PostComment parentComment(User author) {
        PostComment parent = org.mockito.Mockito.mock(PostComment.class);
        when(parent.getUser()).thenReturn(author);
        return parent;
    }
}
