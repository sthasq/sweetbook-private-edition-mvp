package com.playpick;

import com.playpick.config.AppProperties;
import com.playpick.config.GoogleProperties;
import com.playpick.config.OpenRouterProperties;
import com.playpick.config.SweetbookProperties;
import com.playpick.config.TossPaymentsProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({
	AppProperties.class,
	SweetbookProperties.class,
	GoogleProperties.class,
	OpenRouterProperties.class,
	TossPaymentsProperties.class
})
public class PlayPickApplication {

	public static void main(String[] args) {
		SpringApplication.run(PlayPickApplication.class, args);
	}
}
