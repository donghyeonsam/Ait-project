package com.aitserver.user.repository;


import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class UserPurgeRepository {

    private final JdbcTemplate jdbcTemplate;

    /**
     * 삭제 대상 회원 ID를 배치 단위로 조회한다.
     *
     * lastId를 이용한 커서 기반 조회이므로,
     * 중간에 어떤 회원 삭제가 실패해도 무한 반복되지 않는다.
     */
    public List<Long> findExpiredUserIds(
            LocalDateTime cutoff,
            Long lastId,
            int batchSize
    ) {
        String sql = """
                SELECT id
                FROM users
                WHERE deleted_at IS NOT NULL
                  AND deleted_at <= ?
                  AND id > ?
                ORDER BY id ASC
                LIMIT ?
                """;

        return jdbcTemplate.query(
                sql,
                preparedStatement -> {
                    preparedStatement.setTimestamp(
                            1,
                            Timestamp.valueOf(cutoff)
                    );
                    preparedStatement.setLong(2, lastId);
                    preparedStatement.setInt(3, batchSize);
                },
                (resultSet, rowNum) ->
                        resultSet.getLong("id")
        );
    }

    /**
     * 삭제 직전에 해당 사용자가 여전히 삭제 대상인지 확인하고
     * 사용자 행에 잠금을 건다.
     *
     * 탈퇴 복구와 영구 삭제가 동시에 실행되는 상황을 방지한다.
     */
    public boolean lockExpiredUser(
            Long userId,
            LocalDateTime cutoff
    ) {
        String sql = """
                SELECT id
                FROM users
                WHERE id = ?
                  AND deleted_at IS NOT NULL
                  AND deleted_at <= ?
                FOR UPDATE
                """;

        List<Long> result = jdbcTemplate.query(
                sql,
                preparedStatement -> {
                    preparedStatement.setLong(1, userId);
                    preparedStatement.setTimestamp(
                            2,
                            Timestamp.valueOf(cutoff)
                    );
                },
                (resultSet, rowNum) ->
                        resultSet.getLong("id")
        );

        return !result.isEmpty();
    }

    public int deletePeerFeedbacks(Long userId) {
        String sql = """
                DELETE FROM peer_feedbacks
                WHERE evaluator_id = ?
                   OR evaluatee_id = ?
                """;

        return jdbcTemplate.update(
                sql,
                userId,
                userId
        );
    }

    public int deleteAiPeerSummaries(Long userId) {
        String sql = """
                DELETE FROM ai_peer_summaries
                WHERE evaluatee_id = ?
                """;

        return jdbcTemplate.update(
                sql,
                userId
        );
    }

    public int deleteStudyGroupChats(Long userId) {
        String sql = """
                DELETE FROM study_group_chats
                WHERE user_id = ?
                """;

        return jdbcTemplate.update(
                sql,
                userId
        );
    }

    public int deleteStudyGroupMembers(Long userId) {
        String sql = """
                DELETE FROM study_group_members
                WHERE user_id = ?
                """;

        return jdbcTemplate.update(
                sql,
                userId
        );
    }

    public int deleteOwnedStudyGroups(Long userId) {
        String sql = """
                DELETE FROM study_groups
                WHERE owner_id = ?
                """;

        return jdbcTemplate.update(
                sql,
                userId
        );
    }

    /**
     * 실제 users 행 물리 삭제.
     *
     * JPA delete()를 사용하지 않기 때문에
     * @SQLDelete 등의 소프트 삭제 설정을 거치지 않는다.
     */
    public int deleteUser(Long userId) {
        String sql = """
                DELETE FROM users
                WHERE id = ?
                """;

        return jdbcTemplate.update(
                sql,
                userId
        );
    }
}