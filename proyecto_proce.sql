-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1:3307
-- Tiempo de generación: 04-02-2026 a las 23:33:07
-- Versión del servidor: 8.0.44
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `proyecto_proce`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `auditoria`
--

CREATE TABLE `auditoria` (
  `id` int NOT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actor_id` int DEFAULT NULL,
  `accion` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `tabla` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `registro_id` int DEFAULT NULL,
  `detalle` json DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `auditoria`
--

INSERT INTO `auditoria` (`id`, `fecha`, `actor_id`, `accion`, `tabla`, `registro_id`, `detalle`) VALUES
(1, '2026-02-03 13:39:17', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(2, '2026-02-03 13:39:40', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(3, '2026-02-03 13:43:57', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(4, '2026-02-03 13:44:17', 2, 'login', 'usuarios', 2, '{\"rol\": \"encargado\"}'),
(5, '2026-02-03 13:56:56', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(6, '2026-02-03 13:57:06', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(7, '2026-02-03 13:57:17', 2, 'login', 'usuarios', 2, '{\"rol\": \"encargado\"}'),
(8, '2026-02-03 13:59:48', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(9, '2026-02-03 14:01:44', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(10, '2026-02-03 14:02:17', 2, 'login', 'usuarios', 2, '{\"rol\": \"encargado\"}'),
(11, '2026-02-03 14:02:58', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(12, '2026-02-03 14:13:35', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(13, '2026-02-03 14:16:20', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(14, '2026-02-03 14:29:57', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(15, '2026-02-03 14:30:09', 2, 'login', 'usuarios', 2, '{\"rol\": \"encargado\"}'),
(16, '2026-02-03 18:02:59', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(17, '2026-02-03 18:03:26', 2, 'login', 'usuarios', 2, '{\"rol\": \"encargado\"}'),
(18, '2026-02-03 18:09:01', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(19, '2026-02-03 18:09:26', 1, 'logout', 'usuarios', 1, NULL),
(20, '2026-02-03 18:09:36', 2, 'login', 'usuarios', 2, '{\"rol\": \"encargado\"}'),
(21, '2026-02-03 18:09:43', 2, 'logout', 'usuarios', 2, NULL),
(22, '2026-02-03 18:11:53', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(23, '2026-02-03 18:12:23', 1, 'logout', 'usuarios', 1, NULL),
(24, '2026-02-03 18:12:29', 2, 'login', 'usuarios', 2, '{\"rol\": \"encargado\"}'),
(25, '2026-02-03 18:12:43', 2, 'logout', 'usuarios', 2, NULL),
(26, '2026-02-03 18:12:50', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(27, '2026-02-03 18:16:28', 1, 'logout', 'usuarios', 1, NULL),
(28, '2026-02-03 18:28:58', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(29, '2026-02-03 18:32:15', 1, 'logout', 'usuarios', 1, NULL),
(30, '2026-02-03 19:07:21', 1, 'logout', 'usuarios', 1, '[]'),
(31, '2026-02-03 19:07:32', 2, 'login', 'usuarios', 2, '{\"rol\": \"encargado\"}'),
(32, '2026-02-03 19:07:48', 2, 'logout', 'usuarios', 2, '[]'),
(33, '2026-02-03 19:07:57', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(34, '2026-02-03 19:12:59', 1, 'create', 'aulas', 7, '{\"codigo\": \"A-4\", \"estado\": \"disponible\", \"nombre\": \"hola\", \"capacidad\": 10}'),
(35, '2026-02-03 19:13:17', 1, 'delete', 'aulas', 6, '[]'),
(36, '2026-02-03 19:13:34', 1, 'update', 'aulas', 3, '{\"estado\": \"disponible\"}'),
(37, '2026-02-03 19:13:40', 1, 'update', 'aulas', 7, '{\"estado\": \"mantenimiento\"}'),
(38, '2026-02-03 19:13:57', 1, 'delete', 'aulas', 1, '[]'),
(39, '2026-02-03 19:14:02', 1, 'delete', 'aulas', 3, '[]'),
(40, '2026-02-03 19:14:04', 1, 'delete', 'aulas', 2, '[]'),
(41, '2026-02-03 19:18:10', 1, 'logout', 'usuarios', 1, '[]'),
(42, '2026-02-04 06:53:32', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(43, '2026-02-04 06:53:47', 1, 'update', 'aulas', 4, '{\"estado\": \"mantenimiento\"}'),
(44, '2026-02-04 06:54:02', 1, 'logout', 'usuarios', 1, '[]'),
(45, '2026-02-04 06:54:10', 2, 'login', 'usuarios', 2, '{\"rol\": \"encargado\"}'),
(46, '2026-02-04 06:56:49', 2, 'logout', 'usuarios', 2, '[]'),
(47, '2026-02-04 06:56:55', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(48, '2026-02-04 06:57:10', 1, 'create', 'aulas', 8, '{\"codigo\": \"A-5\", \"estado\": \"disponible\", \"nombre\": \"aula 4\", \"capacidad\": 10}'),
(49, '2026-02-04 07:01:15', 1, 'logout', 'usuarios', 1, '[]'),
(50, '2026-02-04 16:02:19', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(51, '2026-02-04 16:02:23', 1, 'logout', 'usuarios', 1, '[]'),
(52, '2026-02-04 16:02:31', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(53, '2026-02-04 16:02:35', 1, 'logout', 'usuarios', 1, '[]'),
(54, '2026-02-04 16:02:42', 2, 'login', 'usuarios', 2, '{\"rol\": \"encargado\"}'),
(55, '2026-02-04 16:02:50', 2, 'logout', 'usuarios', 2, '[]'),
(56, '2026-02-04 16:05:47', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(57, '2026-02-04 16:06:48', 1, 'logout', 'usuarios', 1, '[]'),
(58, '2026-02-04 16:06:56', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(59, '2026-02-04 16:07:09', 1, 'logout', 'usuarios', 1, '[]'),
(60, '2026-02-04 16:10:42', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(61, '2026-02-04 16:10:51', 1, 'logout', 'usuarios', 1, '[]'),
(62, '2026-02-04 16:13:40', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(63, '2026-02-04 16:13:50', 1, 'logout', 'usuarios', 1, '[]'),
(64, '2026-02-04 16:17:10', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(65, '2026-02-04 16:17:18', 1, 'update', 'aulas', 4, '{\"estado\": \"disponible\"}'),
(66, '2026-02-04 16:17:23', 1, 'update', 'aulas', 7, '{\"estado\": \"disponible\"}'),
(67, '2026-02-04 16:20:26', 1, 'logout', 'usuarios', 1, '[]'),
(68, '2026-02-04 16:22:34', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(69, '2026-02-04 16:23:30', 1, 'logout', 'usuarios', 1, '[]'),
(70, '2026-02-04 16:23:39', 19, 'login', 'usuarios', 19, '{\"rol\": \"usuario\"}'),
(71, '2026-02-04 16:24:08', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(72, '2026-02-04 16:24:13', 1, 'logout', 'usuarios', 1, '[]'),
(73, '2026-02-04 16:24:28', 2, 'login', 'usuarios', 2, '{\"rol\": \"encargado\"}'),
(74, '2026-02-04 16:27:29', 2, 'logout', 'usuarios', 2, '[]'),
(75, '2026-02-04 16:36:49', 19, 'login', 'usuarios', 19, '{\"rol\": \"usuario\"}'),
(76, '2026-02-04 16:45:14', 19, 'logout', 'usuarios', 19, '[]'),
(77, '2026-02-04 16:45:16', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(78, '2026-02-04 16:45:26', 1, 'update', 'aulas', 5, '{\"estado\": \"mantenimiento\"}'),
(79, '2026-02-04 16:45:44', 1, 'logout', 'usuarios', 1, '[]'),
(80, '2026-02-04 16:45:49', 2, 'login', 'usuarios', 2, '{\"rol\": \"encargado\"}'),
(81, '2026-02-04 16:46:07', 2, 'logout', 'usuarios', 2, '[]'),
(82, '2026-02-04 16:46:12', 19, 'login', 'usuarios', 19, '{\"rol\": \"usuario\"}'),
(83, '2026-02-04 16:48:06', 19, 'logout', 'usuarios', 19, '[]'),
(84, '2026-02-04 16:48:11', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(85, '2026-02-04 16:52:04', 1, 'logout', 'usuarios', 1, '[]'),
(86, '2026-02-04 16:52:06', 19, 'login', 'usuarios', 19, '{\"rol\": \"usuario\"}'),
(87, '2026-02-04 16:56:21', 19, 'logout', 'usuarios', 19, '[]'),
(88, '2026-02-04 16:56:30', 2, 'login', 'usuarios', 2, '{\"rol\": \"encargado\"}'),
(89, '2026-02-04 16:59:45', 2, 'logout', 'usuarios', 2, '[]'),
(90, '2026-02-04 16:59:47', 2, 'login', 'usuarios', 2, '{\"rol\": \"encargado\"}'),
(91, '2026-02-04 17:02:52', 2, 'logout', 'usuarios', 2, '[]'),
(92, '2026-02-04 17:03:42', 2, 'login', 'usuarios', 2, '{\"rol\": \"encargado\"}'),
(93, '2026-02-04 17:04:17', 2, 'logout', 'usuarios', 2, '[]'),
(94, '2026-02-04 17:04:21', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(95, '2026-02-04 17:04:33', 1, 'create', 'aulas', 9, '{\"codigo\": \"A-6\", \"estado\": \"disponible\", \"nombre\": \"hola\", \"capacidad\": 2}'),
(96, '2026-02-04 17:04:48', 1, 'logout', 'usuarios', 1, '[]'),
(97, '2026-02-04 17:04:52', 19, 'login', 'usuarios', 19, '{\"rol\": \"usuario\"}'),
(98, '2026-02-04 17:04:56', 19, 'logout', 'usuarios', 19, '[]'),
(99, '2026-02-04 17:04:58', 2, 'login', 'usuarios', 2, '{\"rol\": \"encargado\"}'),
(100, '2026-02-04 17:09:39', 2, 'logout', 'usuarios', 2, '[]'),
(101, '2026-02-04 17:09:49', 2, 'login', 'usuarios', 2, '{\"rol\": \"encargado\"}'),
(102, '2026-02-04 17:10:02', 2, 'logout', 'usuarios', 2, '[]'),
(103, '2026-02-04 17:10:07', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(104, '2026-02-04 17:10:12', 1, 'logout', 'usuarios', 1, '[]'),
(105, '2026-02-04 17:10:23', 2, 'login', 'usuarios', 2, '{\"rol\": \"encargado\"}'),
(106, '2026-02-04 17:11:27', 2, 'logout', 'usuarios', 2, '[]'),
(107, '2026-02-04 17:11:30', 1, 'login', 'usuarios', 1, '{\"rol\": \"admin\"}'),
(108, '2026-02-04 17:12:11', 1, 'logout', 'usuarios', 1, '[]'),
(109, '2026-02-04 17:12:17', 2, 'login', 'usuarios', 2, '{\"rol\": \"encargado\"}'),
(110, '2026-02-04 17:15:46', 2, 'logout', 'usuarios', 2, '[]'),
(111, '2026-02-04 17:21:51', 2, 'login', 'usuarios', 2, '{\"rol\": \"encargado\"}'),
(112, '2026-02-04 17:21:53', 2, 'logout', 'usuarios', 2, '[]'),
(113, '2026-02-04 17:22:02', 19, 'login', 'usuarios', 19, '{\"rol\": \"usuario\"}'),
(114, '2026-02-04 17:31:16', 19, 'logout', 'usuarios', 19, '[]');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `aulas`
--

CREATE TABLE `aulas` (
  `id` int NOT NULL,
  `codigo` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `capacidad` int NOT NULL DEFAULT '1',
  `estado` enum('disponible','mantenimiento') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'disponible'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `aulas`
--

INSERT INTO `aulas` (`id`, `codigo`, `nombre`, `capacidad`, `estado`) VALUES
(4, 'A-1', 'Aula A-1', 10, 'disponible'),
(5, 'A-2', 'Aula A-2', 8, 'mantenimiento'),
(7, 'A-4', 'hola', 10, 'disponible'),
(8, 'A-5', 'aula 4', 10, 'disponible'),
(9, 'A-6', 'hola', 2, 'disponible');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `franjas`
--

CREATE TABLE `franjas` (
  `id` int NOT NULL,
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `franjas`
--

INSERT INTO `franjas` (`id`, `hora_inicio`, `hora_fin`) VALUES
(1, '07:00:00', '09:00:00'),
(2, '09:00:00', '11:00:00'),
(3, '11:00:00', '13:00:00'),
(4, '13:00:00', '15:00:00'),
(5, '15:00:00', '17:00:00'),
(6, '17:00:00', '19:00:00'),
(7, '19:00:00', '21:00:00');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `multas`
--

CREATE TABLE `multas` (
  `id` int NOT NULL,
  `reporte_id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `emitida_por` int NOT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `motivo` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `gravedad` enum('baja','media','alta') COLLATE utf8mb4_unicode_ci NOT NULL,
  `monto` decimal(10,2) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reportes`
--

CREATE TABLE `reportes` (
  `id` int NOT NULL,
  `reportante_id` int NOT NULL,
  `reserva_id` int DEFAULT NULL,
  `aula_id` int NOT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `descripcion` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `gravedad` enum('baja','media','alta') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'baja',
  `estado` enum('pendiente','resuelto') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pendiente'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `reservas`
--

CREATE TABLE `reservas` (
  `id` int NOT NULL,
  `usuario_id` int NOT NULL,
  `aula_id` int NOT NULL,
  `fecha` date NOT NULL,
  `franja_id` int NOT NULL,
  `estado` enum('activa','cancelada','finalizada') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'activa',
  `codigo_checkin` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checkin_validado` tinyint(1) NOT NULL DEFAULT '0',
  `checkin_validado_por` int DEFAULT NULL,
  `checkin_validado_en` datetime DEFAULT NULL,
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Disparadores `reservas`
--
DELIMITER $$
CREATE TRIGGER `trg_reservas_max3` BEFORE INSERT ON `reservas` FOR EACH ROW BEGIN
  DECLARE c INT;

  SELECT COUNT(*)
    INTO c
  FROM reservas r
  WHERE r.usuario_id = NEW.usuario_id
    AND r.estado <> 'cancelada'
    AND YEARWEEK(r.fecha, 1) = YEARWEEK(NEW.fecha, 1);

  IF c >= 3 THEN
    SIGNAL SQLSTATE '45000'
      SET MESSAGE_TEXT = 'limite de 3 reservas por semana alcanzado';
  END IF;
END
$$
DELIMITER ;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `roles`
--

CREATE TABLE `roles` (
  `id` int NOT NULL,
  `nombre` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `roles`
--

INSERT INTO `roles` (`id`, `nombre`) VALUES
(1, 'admin'),
(2, 'encargado'),
(3, 'usuario');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `id` int NOT NULL,
  `nombres` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `apellidos` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_usuario` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `cedula` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL,
  `correo` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `rol_id` int NOT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT '1',
  `creado_en` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `actualizado_en` datetime DEFAULT NULL
) ;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`id`, `nombres`, `apellidos`, `nombre_usuario`, `cedula`, `correo`, `telefono`, `password_hash`, `rol_id`, `activo`, `creado_en`, `actualizado_en`) VALUES
(1, 'admin', 'admin', 'admin', '0000000000', 'admin@espe.edu.ec', '0000000000', '$2y$10$1/HPVf8oBaBs9YZSRI8FOe4UNigRIq7J/rJ89aXn1n3DrUGP8AZES', 1, 1, '2026-02-03 13:39:17', NULL),
(2, 'encargado', 'encargado', 'encargado', '0000000001', 'encargado@espe.edu.ec', '0000000001', '$2y$10$JU2c/dpe6jG5GNCaAZ4rue/j1ZaGGr6OQlYb8Ruytql7ZbrC7F3Z2', 2, 1, '2026-02-03 13:39:17', NULL),
(3, 'usuario', 'prueba', 'usuario1', '0000000002', 'usuario1@espe.edu.ec', '0000000002', '$2y$10$9cGQ8c3jzH8DqJm9xRrjzO2d0oM9oB6m0q2Qe3VQp6gZpA8kq6k4u', 3, 1, '2026-02-04 10:42:41', NULL),
(19, 'juan', 'felipe', 'jf2', '0000000004', 'jf2@espe.edu.ec', '0999999992', '$2y$10$H4eZ/keYpskkaA.BA4eDD.c7iKRND34XNCdfIBUEwuKAiRkFdkd.i', 3, 1, '2026-02-04 16:23:16', NULL);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `auditoria`
--
ALTER TABLE `auditoria`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_auditoria_actor` (`actor_id`);

--
-- Indices de la tabla `aulas`
--
ALTER TABLE `aulas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo` (`codigo`);

--
-- Indices de la tabla `franjas`
--
ALTER TABLE `franjas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `hora_inicio` (`hora_inicio`,`hora_fin`);

--
-- Indices de la tabla `multas`
--
ALTER TABLE `multas`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_multas_reporte` (`reporte_id`),
  ADD KEY `fk_multas_usuario` (`usuario_id`),
  ADD KEY `fk_multas_emitida_por` (`emitida_por`);

--
-- Indices de la tabla `reportes`
--
ALTER TABLE `reportes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_reportes_reportante` (`reportante_id`),
  ADD KEY `fk_reportes_reserva` (`reserva_id`),
  ADD KEY `fk_reportes_aula` (`aula_id`);

--
-- Indices de la tabla `reservas`
--
ALTER TABLE `reservas`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `codigo_checkin` (`codigo_checkin`),
  ADD UNIQUE KEY `aula_id` (`aula_id`,`fecha`,`franja_id`),
  ADD KEY `fk_reservas_usuario` (`usuario_id`),
  ADD KEY `fk_reservas_franja` (`franja_id`),
  ADD KEY `fk_reservas_validador` (`checkin_validado_por`);

--
-- Indices de la tabla `roles`
--
ALTER TABLE `roles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre` (`nombre`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `nombre_usuario` (`nombre_usuario`),
  ADD UNIQUE KEY `cedula` (`cedula`),
  ADD UNIQUE KEY `correo` (`correo`),
  ADD KEY `fk_usuarios_roles` (`rol_id`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `auditoria`
--
ALTER TABLE `auditoria`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=115;

--
-- AUTO_INCREMENT de la tabla `aulas`
--
ALTER TABLE `aulas`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `franjas`
--
ALTER TABLE `franjas`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT de la tabla `multas`
--
ALTER TABLE `multas`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `reportes`
--
ALTER TABLE `reportes`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `reservas`
--
ALTER TABLE `reservas`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `roles`
--
ALTER TABLE `roles`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `auditoria`
--
ALTER TABLE `auditoria`
  ADD CONSTRAINT `fk_auditoria_actor` FOREIGN KEY (`actor_id`) REFERENCES `usuarios` (`id`);

--
-- Filtros para la tabla `multas`
--
ALTER TABLE `multas`
  ADD CONSTRAINT `fk_multas_emitida_por` FOREIGN KEY (`emitida_por`) REFERENCES `usuarios` (`id`),
  ADD CONSTRAINT `fk_multas_reporte` FOREIGN KEY (`reporte_id`) REFERENCES `reportes` (`id`),
  ADD CONSTRAINT `fk_multas_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`);

--
-- Filtros para la tabla `reportes`
--
ALTER TABLE `reportes`
  ADD CONSTRAINT `fk_reportes_aula` FOREIGN KEY (`aula_id`) REFERENCES `aulas` (`id`),
  ADD CONSTRAINT `fk_reportes_reportante` FOREIGN KEY (`reportante_id`) REFERENCES `usuarios` (`id`),
  ADD CONSTRAINT `fk_reportes_reserva` FOREIGN KEY (`reserva_id`) REFERENCES `reservas` (`id`);

--
-- Filtros para la tabla `reservas`
--
ALTER TABLE `reservas`
  ADD CONSTRAINT `fk_reservas_aula` FOREIGN KEY (`aula_id`) REFERENCES `aulas` (`id`),
  ADD CONSTRAINT `fk_reservas_franja` FOREIGN KEY (`franja_id`) REFERENCES `franjas` (`id`),
  ADD CONSTRAINT `fk_reservas_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`),
  ADD CONSTRAINT `fk_reservas_validador` FOREIGN KEY (`checkin_validado_por`) REFERENCES `usuarios` (`id`);

--
-- Filtros para la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `fk_usuarios_roles` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
