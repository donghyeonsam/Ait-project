package com.aitserver.user.dto;

import com.aitserver.community.entity.Post;
import lombok.*;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MyPagePostResponse {

    private Long id;
    private Long userId;
    private String category;
    private String title;
    private String content;
    private Integer likeCount;
    private Integer viewCount;


    public static MyPagePostResponse from(
            Post post
    ) {
        return MyPagePostResponse.builder()
                .id(post.getId())
                .userId(post.getUser().getId())
                .category(post.getCategory())
                .title(post.getTitle())
                .content(post.getContent())
                .likeCount(post.getLikeCount())
                .viewCount(post.getViewCount())
                .build();
    }


}
