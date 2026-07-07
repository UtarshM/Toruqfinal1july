<?php
include_once( "ka_include/session.php" );
include( "ka_include/common_function.php" );
include( "ka_include/ka_config.php" );

// if ( isset( $_SESSION[ "adm_id" ] ) ) {
if (isset($_SESSION['adm_id']) && !empty($_SESSION['log_id'])) {

  $log_id = $_SESSION['log_id'];
  $logout_time = date("Y-m-d H:i:s");

  // Fetch login_time from database
    $query = "SELECT login_time FROM login_logs WHERE log_id = '$log_id'";
    $result = $con->query($query);
    $row = $result->fetch_object();
    $login_time = $row->login_time;

    // Calculate session duration in seconds
    $start = strtotime($login_time);
    $end   = strtotime($logout_time);
    $duration = $end - $start;

    if ($duration < 0) {
        $duration = 0; // Safety check to avoid negative durations
    }

  // echo $logout_time; exit;
  // Update logout time and duration
  $sql_update = "UPDATE login_logs SET logout_time = '$logout_time', session_duration = '$duration' WHERE log_id = '$log_id'";
  $con->query($sql_update);
  
  session_destroy();
  header( 'Location: index.php' );

} else {
  session_destroy();
  header( 'Location: index.php' );
}
?>
