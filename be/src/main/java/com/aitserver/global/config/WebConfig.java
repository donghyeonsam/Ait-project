package com.aitserver.global.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${file.upload.dir}")
    private String fileDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // 프론트에서 http://localhost:8080/images/uuid.png 로 요청하면
        // file:///C:/aitserver/uploads/uuid.png 를 읽어서 응답해줌
        registry.addResourceHandler("/images/**")
                .addResourceLocations("file:" + fileDir);
    }
}