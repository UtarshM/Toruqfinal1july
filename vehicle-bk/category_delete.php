<?php
include( "ka_include/session.php" );
include( "ka_include/common_function.php" );
include( "ka_include/ka_config.php" );
include( "ka_include/check_admin_login.php" );
if ( $_SESSION[ 'adm_type' ] != 0 ) {
  header( 'Location: #' );
}
if ( !empty( $_GET[ 'ctg_id' ] ) ) {
  $ctg_id = $_GET[ 'ctg_id' ];
  $updated_by = $_SESSION[ 'adm_id' ];
  $ctg_updated = date( "Y-m-d H:i:s" );
  $sql_category_updt = "UPDATE category_detail SET ctg_status='3', updated_by='" . $updated_by . "', ctg_updated='" . $ctg_updated . "' WHERE ctg_id=" . $ctg_id;
  $updated_qu = $con->query( $sql_category_updt );
  header( 'Location: category_view.php?flag=3' );
}
?>