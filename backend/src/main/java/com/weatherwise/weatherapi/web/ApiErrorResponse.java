/* Author: Nandar Lin */
package com.weatherwise.weatherapi.web;

import java.time.Instant;

public record ApiErrorResponse(
  String message,
  String details,
  Instant timestamp
) {}

