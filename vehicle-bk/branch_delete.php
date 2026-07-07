<?php
include( "ka_include/session.php" );
include( "ka_include/common_function.php" );
include( "ka_include/ka_config.php" );
include( "ka_include/check_admin_login.php" );
if ( $_SESSION[ 'adm_type' ] != 0 ) {
  header( 'Location: #' );
}
if ( !empty( $_GET[ 'branch_id' ] ) ) {
  $branch_id = $_GET[ 'branch_id' ];
  $updated_by = $_SESSION[ 'branch_id' ];
  $updated_date = date( "Y-m-d H:i:s" );
  $sql_admin_updt = "UPDATE branch_detail SET branch_status='3', updated_by='" . $updated_by . "', updated_date='" . $updated_date . "' WHERE branch_id=" . $branch_id;
  $updated_qu = $con->query( $sql_admin_updt );
  header( 'Location: branch_view.php?flag=3' );
}
?>