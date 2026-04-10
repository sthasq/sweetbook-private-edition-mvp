package com.playpick.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.session.data.redis.config.annotation.web.http.EnableRedisIndexedHttpSession;

@Configuration(proxyBeanMethods = false)
@Profile("session-redis")
@EnableRedisIndexedHttpSession(
	maxInactiveIntervalInSeconds = 43200,
	redisNamespace = "playpick:sessions"
)
public class RedisSessionConfig {
}
