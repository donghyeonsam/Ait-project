package com.aitserver.studyGroupRoom.repository;

import com.aitserver.studyGroupRoom.entity.StudyGroupFile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface StudyGroupFileRepository extends JpaRepository<StudyGroupFile, Long> {

    // 파일 조회 시 작성자(User)를 패치 조인으로 한 번에 가져옴
    @Query("SELECT f FROM StudyGroupFile f JOIN FETCH f.user " +
            "WHERE f.studyGroup.id = :groupId ORDER BY f.id DESC")
    Page<StudyGroupFile> findFilesByGroupIdWithUser(
            @Param("groupId") Long groupId,
            Pageable pageable
    );
}