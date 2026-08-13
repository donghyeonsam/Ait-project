package com.aitserver.community.service;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.sql.PreparedStatement;
import java.util.ArrayList;
import java.util.List;

@SpringBootTest
class CommentDummyDataInsertTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    @DisplayName("Ngrinder 테스트용 댓글 더미데이터 6만 건 벌크 인서트")
    void insertDummyComments() {
        Long targetPostId = 1L; // 💡 타겟 게시글 ID (실제 존재하는 게시글 번호로 수정)
        Long targetUserId = 1L; // 💡 작성자 유저 ID (실제 존재하는 유저 번호로 수정)

        int parentCommentCount = 10000; // 원댓글 1만 개
        int childCommentCountPerParent = 5; // 각 원댓글당 대댓글 5개

        // 1. 원댓글(부모) 1만 건 Bulk Insert
        String parentInsertSql = "INSERT INTO posts_comments (post_id, user_id, parent_id, content, created_at, updated_at) " +
                "VALUES (?, ?, NULL, ?, NOW(), NOW())";

        jdbcTemplate.batchUpdate(parentInsertSql, new org.springframework.jdbc.core.BatchPreparedStatementSetter() {
            @Override
            public void setValues(PreparedStatement ps, int i) throws java.sql.SQLException {
                ps.setLong(1, targetPostId);
                ps.setLong(2, targetUserId);
                ps.setString(3, "부하 테스트용 원댓글입니다 " + i);
            }
            @Override
            public int getBatchSize() { return parentCommentCount; }
        });

        System.out.println("✅ 원댓글 1만 건 삽입 완료!");

        // 2. 방금 들어간 원댓글들의 ID를 조회 (대댓글의 parent_id로 쓰기 위함)
        List<Long> parentIds = jdbcTemplate.queryForList(
                "SELECT id FROM posts_comments WHERE post_id = ? AND parent_id IS NULL ORDER BY id DESC LIMIT ?",
                Long.class, targetPostId, parentCommentCount
        );

        // 3. 대댓글(자식) 5만 건 Bulk Insert 조립
        String childInsertSql = "INSERT INTO posts_comments (post_id, user_id, parent_id, content, created_at, updated_at) " +
                "VALUES (?, ?, ?, ?, NOW(), NOW())";

        List<Object[]> childArgs = new ArrayList<>();
        for (Long parentId : parentIds) {
            for (int j = 0; j < childCommentCountPerParent; j++) {
                childArgs.add(new Object[]{targetPostId, targetUserId, parentId, parentId + "번 댓글의 대댓글 " + j});
            }
        }

        jdbcTemplate.batchUpdate(childInsertSql, childArgs);

        System.out.println("✅ 대댓글 5만 건 삽입 완료! (총 6만 건)");
    }
}