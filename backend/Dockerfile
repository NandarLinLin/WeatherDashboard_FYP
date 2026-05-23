# Author: Nandar Lin

# Stage 1: Build the Spring Boot JAR
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Stage 2: Run the application
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /app/target/weather-api-0.0.1-SNAPSHOT.jar app.jar

EXPOSE 8080

# Render injects PORT and database credentials at runtime (never at image build time).
# Required on Render:
#   SPRING_DATASOURCE_URL       — jdbc:mysql://<clever-host>:3306/<db>?sslMode=REQUIRED
#   SPRING_DATASOURCE_USERNAME
#   SPRING_DATASOURCE_PASSWORD
ENV PORT=8080

ENTRYPOINT ["java", "-jar", "app.jar"]
