<?php
include( "ka_include/session.php" );
include( "ka_include/common_function.php" );
include( "ka_include/ka_config.php" );
include( "ka_include/check_admin_login.php" );
if ( $_SESSION[ 'adm_type' ] != 0 ) {
  header( 'Location: #' );
}
if ( !empty( $_GET[ 'adm_id' ] ) ) {
  $adm_id = $_GET[ 'adm_id' ];
  $updated_by = $_SESSION[ 'adm_id' ];
  $adm_updated = date( "Y-m-d H:i:s" );
  $sql_admin_updt = "UPDATE admin_login SET adm_status='3', updated_by='" . $updated_by . "', adm_updated='" . $adm_updated . "' WHERE adm_id=" . $adm_id;
  $updated_qu = $con->query( $sql_admin_updt );
  header( 'Location: admin_view.php?flag=3' );
}
?>