# WeatherWise: Weather Analytics and Personalized Dashboard

WeatherWise is a secure, ad-free, decoupled full-stack web utility designed to solve data fragmentation and session tracking issues found in generic commercial weather platforms. It allows registered users to track global locations simultaneously, manage personal favorite city watchlists, and evaluate historical micro-climatic trends through clear data visualizations.

## Technical Stack
* **Frontend Layer:** React.js, Material UI, Axios, React-Router
* **Backend Layer:** Java 21, Spring Boot 3, Spring Security, Hibernate
* **Database Layer:** MySQL RDBMS (ACID-Compliant Relational Design)
* **Security Framework:** Cryptographic BCrypt hashing, Stateless JSON Web Tokens (JWT)
* **External APIs:** OpenWeatherMap API (Real-time Meteorological Stream Data)
* **Testing & Tools:** Postman API Lifecycle Validation, Git, GitHub

## Key Functional Features
* **Stateless JWT Authentication:** Secure login namespaces ensuring strict user data isolation.
* **Persistent Location Watchlists:** Add, view, and purge customized favorites grids securely stored in a relational database layout.
* **Responsive Layout Architecture:** Smooth element scaling optimized universally for mobile, tablet, and desktop viewports down to a 400px minimum threshold.
* **Ad-Free Clean Data Discovery:** Minimalist design interfaces built to maximize readability and reduce cognitive search fatigue.

## Local Installation & Development Setup

Follow these sequential steps in your terminal to initialize the decoupled application workspace locally:

### 1. Relational Layer Setup
Ensure your local MySQL Server environment is running, log into your monitor, and establish the custom schema:
```sql
CREATE DATABASE weatherwise_db;
USE weatherwise_db;