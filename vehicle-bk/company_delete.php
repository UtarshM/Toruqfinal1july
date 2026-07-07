<?php
include( "ka_include/session.php" );
include( "ka_include/common_function.php" );
include( "ka_include/ka_config.php" );
include( "ka_include/check_admin_login.php" );
if ( $_SESSION[ 'adm_type' ] != 0 ) {
  header( 'Location: #' );
}
if ( !empty( $_GET[ 'cmp_id' ] ) ) {
  $cmp_id = $_GET[ 'cmp_id' ];
  $updated_by = $_SESSION[ 'adm_id' ];
  $cmp_updated = date( "Y-m-d H:i:s" );
  $sql_company_updt = "UPDATE company_detail SET cmp_status='3', updated_by='" . $updated_by . "', cmp_updated='" . $cmp_updated . "' WHERE cmp_id=" . $cmp_id;
  $updated_qu = $con->query( $sql_company_updt );
  header( 'Location: company_view.php?flag=3' );
}
?>