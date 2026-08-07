package com.aitserver.global.config;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJacksonJsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

@Configuration
@EnableCaching
public class CacheConfig {

    @Bean
    public CacheManager cacheManager(
            RedisConnectionFactory redisConnectionFactory
    ) {

        GenericJacksonJsonRedisSerializer jsonSerializer =
                GenericJacksonJsonRedisSerializer.builder()
                        .build();

        RedisCacheConfiguration defaultConfig =
                RedisCacheConfiguration.defaultCacheConfig()
                        .entryTtl(Duration.ofSeconds(60))
                        .disableCachingNullValues()
                        .serializeKeysWith(
                                RedisSerializationContext.SerializationPair
                                        .fromSerializer(
                                                new StringRedisSerializer()
                                        )
                        )
                        .serializeValuesWith(
                                RedisSerializationContext.SerializationPair
                                        .fromSerializer(
                                                jsonSerializer
                                        )
                        )
                        .computePrefixWith(
                                cacheName ->
                                        "ait::" + cacheName + "::"
                        );

        Map<String, RedisCacheConfiguration> cacheConfigurations =
                new HashMap<>();

        cacheConfigurations.put(
                "dashboard",
                defaultConfig.entryTtl(
                        Duration.ofSeconds(60)
                )
        );

        cacheConfigurations.put(
                "myStudyGroups",
                defaultConfig.entryTtl(
                        Duration.ofSeconds(60)
                )
        );

        cacheConfigurations.put(
                "studyGroupDetail",
                defaultConfig.entryTtl(
                        Duration.ofSeconds(60)
                )
        );

        cacheConfigurations.put(
                "reportList",
                defaultConfig.entryTtl(
                        Duration.ofSeconds(60)
                )
        );

        return RedisCacheManager.builder(
                        redisConnectionFactory
                )
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(
                        cacheConfigurations
                )
                .build();
    }
}