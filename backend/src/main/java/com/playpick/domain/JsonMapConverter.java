package com.playpick.domain;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import java.io.IOException;
import java.util.LinkedHashMap;
import java.util.Map;

@Converter
public class JsonMapConverter implements AttributeConverter<Map<String, Object>, String> {

	private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper().findAndRegisterModules();

	private static final TypeReference<LinkedHashMap<String, Object>> TYPE_REFERENCE = new TypeReference<>() {
	};

	@Override
	public String convertToDatabaseColumn(Map<String, Object> attribute) {
		try {
			return OBJECT_MAPPER.writeValueAsString(attribute == null ? Map.of() : attribute);
		} catch (JsonProcessingException exception) {
			throw new IllegalArgumentException("Failed to serialize JSON column", exception);
		}
	}

	@Override
	public Map<String, Object> convertToEntityAttribute(String dbData) {
		if (dbData == null || dbData.isBlank()) {
			return new LinkedHashMap<>();
		}
		try {
			JsonNode node = OBJECT_MAPPER.readTree(dbData);
			if (node.isTextual()) {
				return OBJECT_MAPPER.readValue(node.asText(), TYPE_REFERENCE);
			}
			return OBJECT_MAPPER.convertValue(node, TYPE_REFERENCE);
		} catch (IOException exception) {
			throw new IllegalArgumentException("Failed to deserialize JSON column", exception);
		}
	}
}
