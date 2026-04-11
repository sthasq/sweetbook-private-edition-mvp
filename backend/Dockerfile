FROM eclipse-temurin:17-jdk AS build
WORKDIR /workspace
COPY gradlew gradlew.bat build.gradle settings.gradle ./
COPY gradle gradle
COPY src src
RUN chmod +x gradlew && ./gradlew bootJar --no-daemon

FROM eclipse-temurin:17-jre
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssh-client \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /workspace/build/libs/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
