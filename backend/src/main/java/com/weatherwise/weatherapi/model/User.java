/* Author: Nandar Lin */
package com.weatherwise.weatherapi.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@Entity
@Table(name = "users")
public class User {
  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true)
  private String email;

  @JsonIgnore
  @Column(nullable = false)
  private String password;

  @Column(nullable = false)
  private String fullName;

  @Column(nullable = false)
  private boolean useFahrenheit = false;

  @Column(nullable = false)
  private boolean darkMode = false;

  @Column(nullable = false)
  private boolean severeWeatherAlerts = true;

  @Column(nullable = false)
  private boolean emailNotifications = false;

  @Column(length = 1024)
  private String profilePicturePath;

  @Column(length = 255)
  private String homeCity;
}

