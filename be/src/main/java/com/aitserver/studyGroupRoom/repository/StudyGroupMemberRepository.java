package com.aitserver.studyGroupRoom.repository;


import com.aitserver.studyGroupRoom.entity.StudyGroupMember;
import com.aitserver.studyGroupRoom.domain.StudyGroupMemberStatus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface StudyGroupMemberRepository
        extends JpaRepository<StudyGroupMember, Long> {

    @EntityGraph(attributePaths = {
            "studyGroup",
            "user"
    })
    Optional<StudyGroupMember>
    findByStudyGroupIdAndUserIdAndDeletedAtIsNull(
            Long groupId,
            Long userId
    );

    boolean existsByStudyGroupIdAndUserIdAndStatusAndDeletedAtIsNull(
            Long groupId,
            Long userId,
            StudyGroupMemberStatus status
    );

    long countByStudyGroupIdAndStatusAndDeletedAtIsNull(
            Long groupId,
            StudyGroupMemberStatus status
    );

    @EntityGraph(attributePaths = "user")
    List<StudyGroupMember>
    findAllByStudyGroupIdAndStatusAndDeletedAtIsNull(
            Long groupId,
            StudyGroupMemberStatus status
    );
}