/* Author: Nandar Lin */
package com.weatherwise.weatherapi.repository;

import com.weatherwise.weatherapi.model.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
  Optional<User> findByEmail(String email);
  Optional<User> findByEmailIgnoreCase(String email);
}

