<?php 	error_reporting(0);
 
	$db_host = getenv('DB_HOST') ?: "localhost";
	$db_name = getenv('DB_NAME') ?: "happyh50_vehicleinsurance";
	$db_user = getenv('DB_USER') ?: "happyh50_vehicleinsurance";
	$db_pass = getenv('DB_PASS') ?: "xSO1eqNT6FKzhs";
	// echo $db_user; exit;	
	$con = new mysqli($db_host,$db_user, $db_pass, $db_name);
	// Check connection
	if ($con->connect_error) {
		die("Connection failed: " . $con->connect_error);
	}	
	mysqli_set_charset( $con, 'utf8');
	
?>