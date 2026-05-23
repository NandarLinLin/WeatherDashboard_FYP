# Step 1: Use Maven to compile the Spring Boot application
FROM maven:3.9.6-eclipse-temurin-21 AS build
WORKDIR /app
COPY . .
RUN mvn clean package -DskipTests

# Step 2: Use Java 21 Runtime to execute the compiled jar
FROM eclipse-temurin:21-jre-jammy
WORKDIR /app
COPY --from=build /app/target/weather-api-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]