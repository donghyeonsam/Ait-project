package com.aitserver.community.service;

import com.aitserver.community.entity.Post;
import com.aitserver.community.repository.PostRepository;
import com.aitserver.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

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

    @Test
    @DisplayName("100명의 유저가 동시에 좋아요를 누르면 100개가 올라가야 한다 (하지만 실패할 것이다)")
    void addLikeConcurrencyTest() throws InterruptedException {
        // given: 게시글 1개와 서로 다른 유저 100명을 미리 DB에 저장해둔다고 가정합니다.
        // (실제 테스트 시에는 테스트용 게시글과 100명의 유저를 insert 하는 코드를 여기에 작성해주세요)
        Long targetPostId = 1L;

        int threadCount = 100;

        // 32명의 일꾼(스레드)을 미리 준비시킵니다.
        ExecutorService executorService = Executors.newFixedThreadPool(32);

        // 100명이 전부 다 좋아요를 누를 때까지 메인 스레드가 기다리게 만드는 자물쇠입니다.
        CountDownLatch latch = new CountDownLatch(threadCount);

        // when: 100명의 유저가 "동시에" 좋아요 API 로직을 호출합니다.
        for (int i = 1; i <= threadCount; i++) {
            Long userId = (long) i; // 1번부터 100번 유저

            executorService.submit(() -> {
                try {
                    postInteractionService.addLike(userId, targetPostId);
                } finally {
                    latch.countDown(); // 작업이 끝나면 자물쇠 숫자를 1개씩 풉니다.
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