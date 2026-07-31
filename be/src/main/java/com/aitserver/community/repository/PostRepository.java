package com.aitserver.community.repository;

import com.aitserver.community.entity.Post;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {

    @EntityGraph(attributePaths = {"user"})
    Optional<Post> findById(Long id);

    Page<Post> findByUserId(Long userId, Pageable pageable);

     Page<Post> findByTitleContainingOrContentContaining(String title, String content, Pageable pageable);

    @Query("SELECT DISTINCT p FROM Post p " +
            "LEFT JOIN PostTag pt ON p.id = pt.post.id " +
            "LEFT JOIN pt.tag t " +
            "WHERE p.title LIKE %:keyword% " +
            "OR p.content LIKE %:keyword% " +
            "OR t.name = :keyword")
    Page<Post> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    @Query("SELECT p FROM Post p " +
            "JOIN PostTag pt ON p.id = pt.post.id " +
            "JOIN pt.tag t " +
            "WHERE t.name = :tagName")
    Page<Post> findPostsByExactTag(@Param("tagName") String tagName, Pageable pageable);
}