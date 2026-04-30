/* Author: Nandar Lin */
package com.weatherwise.weatherapi.web;

import java.time.Instant;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {
  @ExceptionHandler(CityNotFoundException.class)
  public ResponseEntity<ApiErrorResponse> handleCityNotFound(CityNotFoundException ex) {
    return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
      new ApiErrorResponse(
        "City not found",
        ex.getCity(),
        Instant.now()
      )
    );
  }

  @ExceptionHandler(IllegalArgumentException.class)
  public ResponseEntity<ApiErrorResponse> handleBadRequest(IllegalArgumentException ex) {
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
      new ApiErrorResponse(
        ex.getMessage() != null ? ex.getMessage() : "Bad request",
        null,
        Instant.now()
      )
    );
  }

  @ExceptionHandler(MethodArgumentNotValidException.class)
  public ResponseEntity<ApiErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
    String details = ex.getBindingResult()
      .getFieldErrors()
      .stream()
      .map(GlobalExceptionHandler::formatFieldError)
      .collect(Collectors.joining(", "));

    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
      new ApiErrorResponse(
        "Validation failed",
        details.isBlank() ? null : details,
        Instant.now()
      )
    );
  }

  private static String formatFieldError(FieldError error) {
    if (error == null) return "Invalid field";
    String field = error.getField();
    String message = error.getDefaultMessage();
    if (field == null || field.isBlank()) return message != null ? message : "Invalid field";
    if (message == null || message.isBlank()) return field + " is invalid";
    return field + ": " + message;
  }
}

