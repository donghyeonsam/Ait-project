package com.aitserver.coverletter.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

@Getter
@NoArgsConstructor
public class CoverLetterCreateRequest {

    @NotBlank(message = "자기소개서 제목은 필수입니다.")
    @Size(max = 50, message = "자기소개서 제목은 50자 이하여야 합니다.")
    private String title;

    @NotBlank(message = "회사 이름은 필수입니다.")
    @Size(max = 100, message = "회사 이름은 100자 이하여야 합니다.")
    private String companyName;

    @NotBlank(message = "지원 직무는 필수입니다.")
    @Size(max = 50, message = "지원 직무는 50자 이하여야 합니다.")
    private String role;

    @Valid
    @NotEmpty(message = "자기소개서 문항은 한 개 이상이어야 합니다.")
    private List<CoverLetterContentCreateRequest> coverLetterContents;
}