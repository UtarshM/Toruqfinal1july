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
if ( !in_array( "6", $md_right ) ) {
  header( 'Location: rto_dashboard.php' ); 
}
// Check Module Rights

if ( !empty( $_GET[ 'rtsk_id' ] ) ) {
  $rtsk_id = $_GET[ 'rtsk_id' ];
  $rto_id = $_GET[ 'rto_id' ];
  $updated_by = $_SESSION[ 'adm_id' ];
  $updated_date = date( "Y-m-d H:i:s" );

  $sql_expe_updt = "UPDATE rto_task_detail SET rtsk_status='3', updated_by='".$updated_by."', updated_date='".$updated_date."' WHERE rtsk_id=".$rtsk_id;
  $updated_qu = $con->query( $sql_expe_updt );

  header( 'Location: license_task_view.php?rto_id='.$rto_id.'&flag=3' );
}
?>
