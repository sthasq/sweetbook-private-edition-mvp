package com.privateedition;

import com.privateedition.config.AppProperties;
import com.privateedition.config.GoogleProperties;
import com.privateedition.config.SweetbookProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties({
	AppProperties.class,
	SweetbookProperties.class,
	GoogleProperties.class
})
public class PrivateEditionApplication {

	public static void main(String[] args) {
		SpringApplication.run(PrivateEditionApplication.class, args);
	}
}
