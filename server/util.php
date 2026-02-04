<?php

if (!function_exists("json_out")) {
  function json_out($arr, $code = 200) {
    http_response_code($code);
    header("Content-Type: application/json; charset=utf-8");
    echo json_encode($arr, JSON_UNESCAPED_UNICODE);
    exit;
  }
}

if (!function_exists("body_json")) {
  function body_json() {
    $raw = file_get_contents("php://input");
    $d = json_decode($raw, true);
    return is_array($d) ? $d : [];
  }
}

function require_fields($d, $fields) {
  foreach ($fields as $f) {
    if (!isset($d[$f]) || trim((string)$d[$f]) === "") return $f;
  }
  return null;
}

function email_espe($correo) {
  $correo = strtolower(trim($correo));
  return (bool)preg_match('/^[^@\s]+@espe\.edu\.ec$/', $correo);
}

function cedula_ec_valida($ced) {
  $ced = trim($ced);
  if (!preg_match('/^\d{10}$/', $ced)) return false;

  $prov = intval(substr($ced, 0, 2));
  if ($prov < 1 || $prov > 24) return false;

  $ter = intval($ced[2]);
  if ($ter > 5) return false;

  $suma = 0;
  for ($i = 0; $i < 9; $i++) {
    $dig = intval($ced[$i]);
    if ($i % 2 == 0) {
      $dig *= 2;
      if ($dig > 9) $dig -= 9;
    }
    $suma += $dig;
  }
  $ver = (10 - ($suma % 10)) % 10;
  return $ver === intval($ced[9]);
}

function gen_checkin_code($len = 4) {
  $abc = "abcdefghijklmnopqrstuvwxyz0123456789";
  $part = function() use ($abc, $len) {
    $s = "";
    for ($i=0; $i<$len; $i++) $s .= $abc[random_int(0, strlen($abc)-1)];
    return $s;
  };
  return $part() . "-" . $part();
}

/**
 * ✅ auditoria: usa actor_id (NO usuario_id)
 * tabla auditoria: actor_id, accion, tabla, registro_id, detalle
 */
function audit_log($enlace, $actorId, $accion, $tabla, $registroId = null, $detalleArr = null) {
  if (!$enlace) return;

  $actorId = ($actorId !== null) ? (int)$actorId : null;
  $accion = (string)$accion;
  $tabla = (string)$tabla;

  $reg = ($registroId === null) ? null : (int)$registroId;

  $detalleJson = null;
  if (is_array($detalleArr) || is_object($detalleArr)) {
    $detalleJson = json_encode($detalleArr, JSON_UNESCAPED_UNICODE);
  } elseif (is_string($detalleArr) && $detalleArr !== "") {
    $detalleJson = $detalleArr;
  }

  $sql = "INSERT INTO auditoria (actor_id, accion, tabla, registro_id, detalle)
          VALUES (?, ?, ?, ?, ?)";

  $st = mysqli_prepare($enlace, $sql);
  if (!$st) return;

  // i = actor_id, s = accion, s = tabla, i = registro_id, s = detalle
  mysqli_stmt_bind_param($st, "issis", $actorId, $accion, $tabla, $reg, $detalleJson);
  @mysqli_stmt_execute($st);
  mysqli_stmt_close($st);
}
