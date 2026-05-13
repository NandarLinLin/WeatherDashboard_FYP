/* Author: Nandar Lin */
package com.weatherwise.weatherapi.service;

import com.weatherwise.weatherapi.dto.WeatherResponse;
import com.weatherwise.weatherapi.model.User;
import com.weatherwise.weatherapi.repository.UserRepository;
import com.weatherwise.weatherapi.web.CityNotFoundException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

@Service
public class SevereWeatherEmailScheduler {
  private static final Logger log = LoggerFactory.getLogger(SevereWeatherEmailScheduler.class);

  private final UserRepository userRepository;
  private final WeatherService weatherService;
  private final ObjectProvider<JavaMailSender> mailSenderProvider;

  @Value("${spring.mail.username:}")
  private String mailUsername;

  public SevereWeatherEmailScheduler(
    UserRepository userRepository,
    WeatherService weatherService,
    ObjectProvider<JavaMailSender> mailSenderProvider
  ) {
    this.userRepository = userRepository;
    this.weatherService = weatherService;
    this.mailSenderProvider = mailSenderProvider;
  }

  @Scheduled(fixedRate = 3_600_000L)
  public void notifyUsersOfSevereHomeCityWeather() {
    JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
    if (mailSender == null || mailUsername == null || mailUsername.isBlank()) {
      log.debug("Severe weather email run skipped: JavaMailSender or spring.mail.username not configured.");
      return;
    }

    List<User> subscribers = userRepository.findByEmailNotificationsTrue();
    for (User user : subscribers) {
      String home = user.getHomeCity();
      if (home == null || home.isBlank()) {
        continue;
      }
      try {
        WeatherResponse weather = weatherService.getCurrentWeatherByCity(home.trim());
        String description = weather.description() != null ? weather.description() : "";
        if (!SevereWeatherConditions.isSevere(description, weather.temperatureCelsius())) {
          continue;
        }
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(mailUsername);
        message.setTo(user.getEmail());
        message.setSubject("URGENT: Severe Weather Alert for " + home.trim());
        String name = user.getFullName() != null ? user.getFullName().trim() : "";
        if (name.isEmpty()) {
          name = "there";
        }
        message.setText(
          "Hello " + name + ", we've detected " + description + " in your home city. Stay safe!"
        );
        mailSender.send(message);
        log.info("Sent severe weather email to user id={} for homeCity={}", user.getId(), home.trim());
      } catch (CityNotFoundException ex) {
        log.warn("Home city not found for user id={}: {}", user.getId(), home);
      } catch (Exception ex) {
        log.error("Severe weather email failed for user id={}", user.getId(), ex);
      }
    }
  }
}
