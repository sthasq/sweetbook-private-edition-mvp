package com.privateedition.config;

import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;

@Configuration(proxyBeanMethods = false)
@Profile("session-redis")
@EnableCaching
public class RedisCacheConfig {

	@Bean
	CacheManager cacheManager(RedisConnectionFactory connectionFactory, ObjectMapper objectMapper) {
		ObjectMapper cacheObjectMapper = objectMapper.copy();
		cacheObjectMapper.activateDefaultTyping(
			LaissezFaireSubTypeValidator.instance,
			ObjectMapper.DefaultTyping.NON_FINAL,
			JsonTypeInfo.As.PROPERTY
		);

		GenericJackson2JsonRedisSerializer serializer =
			new GenericJackson2JsonRedisSerializer(cacheObjectMapper);

		RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
			.serializeValuesWith(
				RedisSerializationContext.SerializationPair.fromSerializer(serializer)
			)
			.entryTtl(Duration.ofMinutes(10))
			.disableCachingNullValues();

		Map<String, RedisCacheConfiguration> cacheConfigurations = new LinkedHashMap<>();
		cacheConfigurations.put("sweetbook-book-specs", defaultConfig.entryTtl(Duration.ofHours(6)));
		cacheConfigurations.put("sweetbook-templates", defaultConfig.entryTtl(Duration.ofHours(1)));

		return RedisCacheManager.builder(connectionFactory)
			.cacheDefaults(defaultConfig)
			.withInitialCacheConfigurations(cacheConfigurations)
			.transactionAware()
			.build();
	}
}
