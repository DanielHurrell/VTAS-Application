-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Nov 11, 2026 at 07:18 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

CREATE DATABASE IF NOT EXISTS vtas
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE vtas;

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `vtas`
--

-- --------------------------------------------------------

--
-- Table structure for table `administrators`
--

CREATE TABLE `administrators` (
  `administrator_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `employee_number` varchar(50) DEFAULT NULL,
  `access_level` varchar(50) DEFAULT 'Standard',
  `department` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `administrators`
--

INSERT INTO `administrators` (`administrator_id`, `user_id`, `employee_number`, `access_level`, `department`) VALUES
(1, 1, NULL, 'Super', NULL),
(2, 109, NULL, 'Standard', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `applicants`
--

CREATE TABLE `applicants` (
  `applicant_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `date_of_birth` date DEFAULT NULL,
  `nationality` varchar(100) DEFAULT NULL,
  `phone` varchar(20) DEFAULT NULL,
  `address` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `applicants`
--

INSERT INTO `applicants` (`applicant_id`, `user_id`, `date_of_birth`, `nationality`, `phone`, `address`) VALUES
(101, 101, '1994-03-12', 'Nigerian', '+234 803 555 0101', '12 Allen Avenue, Lagos'),
(102, 102, '1990-07-25', 'Zimbabwean', '+263 77 555 0102', '45 Samora Machel Ave, Harare'),
(103, 103, '1998-11-02', 'Indian', '+91 98 5550 0103', '8 MG Road, Bengaluru'),
(104, 104, '1985-01-18', 'British', '+44 7700 900104', '21 Baker Street, London'),
(105, 105, '1992-09-30', 'Chinese', '+86 138 5550 0105', '99 Nanjing Road, Shanghai'),
(106, 106, '1996-05-14', 'Kenyan', '+254 712 555 106', '3 Kenyatta Avenue, Nairobi'),
(107, 110, '1998-07-24', 'British', '0782321234', '1 De beers avenue');

-- --------------------------------------------------------

--
-- Table structure for table `application_documents`
--

CREATE TABLE `application_documents` (
  `document_id` int(11) NOT NULL,
  `application_id` int(11) NOT NULL,
  `original_filename` varchar(255) NOT NULL,
  `stored_filename` varchar(255) NOT NULL,
  `file_path` varchar(500) NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `file_size` int(11) NOT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `application_documents`
--

INSERT INTO `application_documents` (`document_id`, `application_id`, `original_filename`, `stored_filename`, `file_path`, `mime_type`, `file_size`, `uploaded_at`) VALUES
(1, 112, 'Group 34 Phase 4.pdf', 'bbdfcfad-1a0b-442d-97da-3738b68fae8e.pdf', 'uploads/application-documents/bbdfcfad-1a0b-442d-97da-3738b68fae8e.pdf', 'application/pdf', 1107538, '2026-11-11 17:41:12');

-- --------------------------------------------------------

--
-- Table structure for table `audit_logs`
--

CREATE TABLE `audit_logs` (
  `log_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `audit_logs`
--

INSERT INTO `audit_logs` (`log_id`, `user_id`, `action`, `description`, `ip_address`, `created_at`) VALUES
(1, 1, 'Create Admin', 'Created admin account #109 (jd@vtas.co.za)', '::1', '2026-11-11 16:45:42');

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `notification_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `application_id` int(11) DEFAULT NULL,
  `message` text NOT NULL,
  `notification_type` varchar(50) DEFAULT NULL,
  `scheduled_at` datetime DEFAULT NULL,
  `sent_at` datetime DEFAULT NULL,
  `delivery_status` enum('Pending','Sent','Failed') DEFAULT 'Pending',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `passports`
--

CREATE TABLE `passports` (
  `passport_id` int(11) NOT NULL,
  `applicant_id` int(11) NOT NULL,
  `passport_number` varchar(50) NOT NULL,
  `country_of_issue` varchar(100) NOT NULL,
  `issue_date` date NOT NULL,
  `expiry_date` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `passports`
--

INSERT INTO `passports` (`passport_id`, `applicant_id`, `passport_number`, `country_of_issue`, `issue_date`, `expiry_date`) VALUES
(101, 101, 'A10000101', 'Nigeria', '2019-04-01', '2026-12-01'),
(102, 102, 'ZW0000102', 'Zimbabwe', '2021-06-15', '2031-06-14'),
(103, 103, 'P10000103', 'India', '2022-01-10', '2032-01-09'),
(104, 104, 'GB0000104', 'United Kingdom', '2017-02-20', '2027-01-25'),
(105, 105, 'E10000105', 'China', '2020-08-08', '2030-08-07'),
(106, 106, 'AK0000106', 'Kenya', '2023-03-03', '2033-03-02'),
(107, 107, '123456789', 'South Africa', '2020-01-01', '2030-01-01');

-- --------------------------------------------------------

--
-- Table structure for table `status_history`
--

CREATE TABLE `status_history` (
  `history_id` int(11) NOT NULL,
  `application_id` int(11) NOT NULL,
  `previous_status` varchar(50) DEFAULT NULL,
  `new_status` varchar(50) NOT NULL,
  `changed_by` int(11) NOT NULL,
  `remarks` text DEFAULT NULL,
  `changed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `status_history`
--

INSERT INTO `status_history` (`history_id`, `application_id`, `previous_status`, `new_status`, `changed_by`, `remarks`, `changed_at`) VALUES
(1, 111, NULL, 'Submitted', 110, 'Application submitted', '2026-11-11 17:06:18'),
(2, 112, NULL, 'Submitted', 110, 'Application submitted', '2026-11-11 17:41:12');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `user_id` int(11) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('applicant','admin') DEFAULT 'applicant',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `is_active` tinyint(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`user_id`, `full_name`, `email`, `password`, `role`, `created_at`, `is_active`) VALUES
(1, 'Super Admin', 'superadmin@vtas.com', '$2b$10$kpvTPhQSueS4/FdHRHmSTe1pa8n0tuKACMv139s9u7vWILVB/Rn7W', 'admin', '2026-11-10 08:00:00', 1),
(101, 'Amara Okafor', 'amara@test.vtas', 'test-account-no-login', 'applicant', '2026-11-11 16:43:34', 1),
(102, 'Tendai Moyo', 'tendai@test.vtas', 'test-account-no-login', 'applicant', '2026-11-11 16:43:34', 1),
(103, 'Priya Sharma', 'priya@test.vtas', 'test-account-no-login', 'applicant', '2026-11-11 16:43:34', 1),
(104, 'James Carter', 'james@test.vtas', 'test-account-no-login', 'applicant', '2026-11-11 16:43:34', 1),
(105, 'Chen Wei', 'chen@test.vtas', 'test-account-no-login', 'applicant', '2026-11-11 16:43:34', 1),
(106, 'Fatima Hassan', 'fatima@test.vtas', 'test-account-no-login', 'applicant', '2026-11-11 16:43:34', 1),
(109, 'John Doe', 'jd@vtas.co.za', '$2b$10$xyNGpPNiVPb5DH5hnm7uOewY.vTIAzcU4sG0VrrM0iIL9S74Sjmoi', 'admin', '2026-11-11 16:45:42', 1),
(110, 'Dan hur', 'd@gmail.com', '$2b$10$wYIhZOXfndHCUUIeo2KzjeCwnGGf6PkJkrJYnKA47iCQPLD8O5Lci', 'applicant', '2026-11-11 17:04:39', 1);

-- --------------------------------------------------------

--
-- Table structure for table `visas`
--

CREATE TABLE `visas` (
  `visa_id` int(11) NOT NULL,
  `application_id` int(11) NOT NULL,
  `visa_number` varchar(100) NOT NULL,
  `issue_date` date NOT NULL,
  `expiry_date` date NOT NULL,
  `validity_status` enum('Active','Expiring Soon','Expired') DEFAULT 'Active',
  `conditions` text DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `visas`
--

INSERT INTO `visas` (`visa_id`, `application_id`, `visa_number`, `issue_date`, `expiry_date`, `validity_status`, `conditions`) VALUES
(101, 101, 'ZA-V-0101', '2026-05-05', '2026-11-16', 'Expiring Soon', 'Employment with sponsoring company only'),
(102, 102, 'ZA-V-0102', '2026-05-25', '2026-11-24', 'Expiring Soon', 'Full-time study at registered institution'),
(103, 103, 'ZA-V-0103', '2026-06-24', '2026-12-06', 'Expiring Soon', NULL),
(104, 104, 'ZA-V-0104', '2026-07-24', '2026-11-01', 'Expired', 'No employment permitted'),
(105, 105, 'ZA-V-0105', '2026-08-23', '2027-05-30', 'Active', 'Employment with sponsoring company only');

-- --------------------------------------------------------

--
-- Table structure for table `visa_applications`
--

CREATE TABLE `visa_applications` (
  `application_id` int(11) NOT NULL,
  `applicant_id` int(11) NOT NULL,
  `passport_id` int(11) NOT NULL,
  `visa_type` varchar(100) NOT NULL,
  `destination_country` varchar(100) NOT NULL,
  `application_date` timestamp NOT NULL DEFAULT current_timestamp(),
  `current_status` enum('Submitted','Under Review','Additional Documents Required','Approved','Rejected') DEFAULT 'Submitted'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `visa_applications`
--

INSERT INTO `visa_applications` (`application_id`, `applicant_id`, `passport_id`, `visa_type`, `destination_country`, `application_date`, `current_status`) VALUES
(101, 101, 101, 'Work Visa', 'South Africa', '2026-04-25 16:43:34', 'Approved'),
(102, 102, 102, 'Student Visa', 'South Africa', '2026-05-15 16:43:34', 'Approved'),
(103, 103, 103, 'Business Visa', 'South Africa', '2026-06-14 16:43:34', 'Approved'),
(104, 104, 104, 'Tourist Visa', 'South Africa', '2026-07-14 16:43:34', 'Approved'),
(105, 105, 105, 'Work Visa', 'South Africa', '2026-08-13 16:43:34', 'Approved'),
(106, 106, 106, 'Tourist Visa', 'South Africa', '2026-11-01 16:43:34', 'Submitted'),
(107, 103, 103, 'Tourist Visa', 'South Africa', '2026-11-03 16:43:34', 'Under Review'),
(108, 105, 105, 'Business Visa', 'South Africa', '2026-11-05 16:43:34', 'Additional Documents Required'),
(109, 102, 102, 'Transit Visa', 'South Africa', '2026-10-12 16:43:34', 'Rejected'),
(110, 106, 106, 'Work Visa', 'South Africa', '2026-11-09 16:43:34', 'Submitted'),
(111, 107, 107, 'Student Visa', 'South Africa', '2026-11-11 17:06:18', 'Submitted'),
(112, 107, 107, 'Tourist Visa', 'South Africa', '2026-11-11 17:41:12', 'Submitted');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `administrators`
--
ALTER TABLE `administrators`
  ADD PRIMARY KEY (`administrator_id`),
  ADD UNIQUE KEY `user_id` (`user_id`);

--
-- Indexes for table `applicants`
--
ALTER TABLE `applicants`
  ADD PRIMARY KEY (`applicant_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `application_documents`
--
ALTER TABLE `application_documents`
  ADD PRIMARY KEY (`document_id`),
  ADD KEY `idx_application_id` (`application_id`);

--
-- Indexes for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD PRIMARY KEY (`log_id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`notification_id`),
  ADD KEY `user_id` (`user_id`),
  ADD KEY `application_id` (`application_id`);

--
-- Indexes for table `passports`
--
ALTER TABLE `passports`
  ADD PRIMARY KEY (`passport_id`),
  ADD UNIQUE KEY `passport_number` (`passport_number`),
  ADD KEY `applicant_id` (`applicant_id`);

--
-- Indexes for table `status_history`
--
ALTER TABLE `status_history`
  ADD PRIMARY KEY (`history_id`),
  ADD KEY `application_id` (`application_id`),
  ADD KEY `changed_by` (`changed_by`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`user_id`),
  ADD UNIQUE KEY `email` (`email`);

--
-- Indexes for table `visas`
--
ALTER TABLE `visas`
  ADD PRIMARY KEY (`visa_id`),
  ADD UNIQUE KEY `application_id` (`application_id`);

--
-- Indexes for table `visa_applications`
--
ALTER TABLE `visa_applications`
  ADD PRIMARY KEY (`application_id`),
  ADD KEY `applicant_id` (`applicant_id`),
  ADD KEY `passport_id` (`passport_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `administrators`
--
ALTER TABLE `administrators`
  MODIFY `administrator_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `applicants`
--
ALTER TABLE `applicants`
  MODIFY `applicant_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=108;

--
-- AUTO_INCREMENT for table `application_documents`
--
ALTER TABLE `application_documents`
  MODIFY `document_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `audit_logs`
--
ALTER TABLE `audit_logs`
  MODIFY `log_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `notification_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `passports`
--
ALTER TABLE `passports`
  MODIFY `passport_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=108;

--
-- AUTO_INCREMENT for table `status_history`
--
ALTER TABLE `status_history`
  MODIFY `history_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `user_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=111;

--
-- AUTO_INCREMENT for table `visas`
--
ALTER TABLE `visas`
  MODIFY `visa_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=106;

--
-- AUTO_INCREMENT for table `visa_applications`
--
ALTER TABLE `visa_applications`
  MODIFY `application_id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=113;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `administrators`
--
ALTER TABLE `administrators`
  ADD CONSTRAINT `administrators_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `applicants`
--
ALTER TABLE `applicants`
  ADD CONSTRAINT `applicants_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `application_documents`
--
ALTER TABLE `application_documents`
  ADD CONSTRAINT `fk_application_documents` FOREIGN KEY (`application_id`) REFERENCES `visa_applications` (`application_id`) ON DELETE CASCADE;

--
-- Constraints for table `audit_logs`
--
ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `notifications_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`user_id`),
  ADD CONSTRAINT `notifications_ibfk_2` FOREIGN KEY (`application_id`) REFERENCES `visa_applications` (`application_id`);

--
-- Constraints for table `passports`
--
ALTER TABLE `passports`
  ADD CONSTRAINT `passports_ibfk_1` FOREIGN KEY (`applicant_id`) REFERENCES `applicants` (`applicant_id`);

--
-- Constraints for table `status_history`
--
ALTER TABLE `status_history`
  ADD CONSTRAINT `status_history_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `visa_applications` (`application_id`),
  ADD CONSTRAINT `status_history_ibfk_2` FOREIGN KEY (`changed_by`) REFERENCES `users` (`user_id`);

--
-- Constraints for table `visas`
--
ALTER TABLE `visas`
  ADD CONSTRAINT `visas_ibfk_1` FOREIGN KEY (`application_id`) REFERENCES `visa_applications` (`application_id`);

--
-- Constraints for table `visa_applications`
--
ALTER TABLE `visa_applications`
  ADD CONSTRAINT `visa_applications_ibfk_1` FOREIGN KEY (`applicant_id`) REFERENCES `applicants` (`applicant_id`),
  ADD CONSTRAINT `visa_applications_ibfk_2` FOREIGN KEY (`passport_id`) REFERENCES `passports` (`passport_id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
