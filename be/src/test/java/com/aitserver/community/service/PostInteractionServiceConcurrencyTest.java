package com.aitserver.community.service;

import com.aitserver.community.entity.Post;
import com.aitserver.community.repository.PostLikeScrapRepository;
import com.aitserver.community.repository.PostRepository;
import com.aitserver.user.entity.User;
import com.aitserver.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class PostInteractionServiceConcurrencyTest {

    @Autowired
    private PostInteractionService postInteractionService;

    // 💡 회원님의 Repository 이름에 맞게 수정해주세요!
    @Autowired
    private PostRepository postRepository;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PostLikeScrapRepository postLikeScrapRepository;

    private Long targetPostId;
    private final List<Long> userIds = new ArrayList<>();

    @BeforeEach
    void setUp() {
        // 매번 실행할 때마다 고유한 난수를 생성해서 이메일 중복을 원천 차단합니다.
        String unique = UUID.randomUUID().toString().substring(0, 8);

        // 1. 유저 100명 생성 및 DB에 찐 저장
        List<User> dummyUsers = new ArrayList<>();
        for (int i = 0; i < 100; i++) {
            User user = User.builder()
                    .nickname("테스트유저_" + unique + "_" + i)
                    .email("test_" + unique + "_" + i + "@ssafy.com")
                    .password("1234")
                    .name("asdf")
                    .build();
            dummyUsers.add(user);
        }
        userRepository.saveAll(dummyUsers);

        // 생성된 유저들의 실제 DB PK(ID)를 리스트에 담아둠
        dummyUsers.forEach(user -> userIds.add(user.getId()));

        // 2. 좋아요를 받을 타겟 게시글 1개 생성 및 저장
        Post post = Post.builder()
                .title("동시성 테스트 게시글")
                .content("내용")
                .category("면접 후기")
                // 💡 ID 1번 유저를 억지로 찾지 말고, 방금 만든 더미 유저 중 1명을 작성자로 넣습니다!
                .user(dummyUsers.get(0))
                .build();
        targetPostId = postRepository.save(post).getId();
    }

    @Test
    @DisplayName("100명의 유저가 동시에 좋아요를 누르면 100개가 올라가야 한다 (하지만 실패할 것이다)")
    void addLikeConcurrencyTest() throws InterruptedException {
        int threadCount = 100;
        // 32명의 일꾼(스레드)을 미리 준비시킵니다.
        ExecutorService executorService = Executors.newFixedThreadPool(32);

        // 100명이 전부 다 좋아요를 누를 때까지 메인 스레드가 기다리게 만드는 자물쇠입니다.
        CountDownLatch latch = new CountDownLatch(threadCount);

        // when: 100명의 유저가 "동시에" 좋아요 API 로직을 호출합니다.
        for (int i = 0; i < threadCount; i++) {
            Long userId = userIds.get(i);

            executorService.submit(() -> {
                try {
                    postInteractionService.addLike(userId, targetPostId);
                } finally {
                    latch.countDown();
                }
            });
        }

        // 100개의 작업이 다 끝날 때까지 여기서 대기합니다.
        latch.await();

        // then: 게시글의 최종 좋아요 개수를 확인합니다.
        // 회원님의 Post 엔티티 조회 방식에 맞게 수정해주세요!
        Post post = postRepository.findById(targetPostId).orElseThrow();

        System.out.println("🔥 100명이 눌렀는데 실제 올라간 좋아요 수: " + post.getLikeCount());

        // 100을 기대하지만, 무조건 테스트는 실패(빨간불)할 것입니다!
        assertThat(post.getLikeCount()).isEqualTo(100);
    }
}