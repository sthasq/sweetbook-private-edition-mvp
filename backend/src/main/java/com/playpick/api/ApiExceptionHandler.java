package com.playpick.api;

import com.playpick.application.AppException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

	@ExceptionHandler(AppException.class)
	public ProblemDetail handleAppException(AppException exception) {
		ProblemDetail detail = ProblemDetail.forStatusAndDetail(exception.getStatus(), exception.getMessage());
		detail.setTitle(exception.getStatus().getReasonPhrase());
		detail.setProperty("timestamp", Instant.now());
		return detail;
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ProblemDetail handleValidationException(MethodArgumentNotValidException exception) {
		ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed");
		Map<String, String> errors = new LinkedHashMap<>();
		for (FieldError fieldError : exception.getBindingResult().getFieldErrors()) {
			errors.put(fieldError.getField(), fieldError.getDefaultMessage());
		}
		detail.setProperty("errors", errors);
		detail.setProperty("timestamp", Instant.now());
		return detail;
	}

	@ExceptionHandler(Exception.class)
	public ProblemDetail handleGenericException(Exception exception) {
		ProblemDetail detail = ProblemDetail.forStatusAndDetail(HttpStatus.INTERNAL_SERVER_ERROR, exception.getMessage());
		detail.setTitle("Internal Server Error");
		detail.setProperty("timestamp", Instant.now());
		return detail;
	}
}
