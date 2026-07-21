-- 사용자 정보 관련
DROP TABLE IF EXISTS users;

-- 사용자 정보 관련
CREATE TABLE IF NOT EXISTS users (
                      id BIGINT AUTO_INCREMENT PRIMARY KEY,
                   email VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL, -- 비밀번호 암호화(BCrypt 등)를 고려해 넉넉하게 255로 설정하는 것이 좋습니다.
                    name VARCHAR(20) NOT NULL,
                nickname VARCHAR(20) NOT NULL,
                    role VARCHAR(20) NOT NULL DEFAULT 'USER', -- 앞서 논의한 확장성을 위해 VARCHAR 사용 추천
      first_job_interest VARCHAR(30) DEFAULT NULL,
    second_job_interest VARCHAR(30) DEFAULT NULL,
           profile_image VARCHAR(255) DEFAULT NULL,
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              updated_at DATETIME DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP, -- 수정될 때 자동으로 현재 시간 갱신
              deleted_at DATETIME DEFAULT NULL
);