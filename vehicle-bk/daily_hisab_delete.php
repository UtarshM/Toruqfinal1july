<?php
include( "ka_include/session.php" );
include( "ka_include/common_function.php" );
include( "ka_include/ka_config.php" );
include( "ka_include/check_admin_login.php" );
// Check Module Rights
$query_module_detail = "SELECT * FROM admin_login ld where adm_id='" . $_SESSION[ 'adm_id' ] . "' and adm_status=1";
$module_query = $con->query( $query_module_detail );
$row_md_id = $module_query->fetch_array();
// echo $row_state['md_id']; exit;
$md_right = explode( ",", $row_md_id[ 'md_id' ] );
if ( !in_array( "9", $md_right ) ) {
  header( 'Location: #' );
}
// Check Module Rights

if ( isset( $_GET[ 'status_id' ] ) && $_GET[ 'status_id' ] != "" )
  $status_id = $_GET[ 'status_id' ];
if ( !empty( $_GET[ 'dl_hsb_id' ] ) ) {
  $dl_hsb_id = $_GET[ 'dl_hsb_id' ];
  $updated_by = $_SESSION[ 'adm_id' ];
  $updated_date = date( "Y-m-d H:i:s" );

  $sql_expe_updt = "UPDATE daily_hisab_detail SET dl_hsb_status='3', updated_by='" . $updated_by . "', updated_date='" . $updated_date . "' WHERE dl_hsb_id=" . $dl_hsb_id;
  $updated_qu = $con->query( $sql_expe_updt );

  header( 'Location: daily_hisab_view.php?flag=3' );
}
?>
