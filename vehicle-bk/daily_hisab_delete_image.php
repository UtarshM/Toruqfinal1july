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
if ( !in_array( "2", $md_right ) ) {
  header( 'Location: #' );
}
// Check Module Rights
if ( $_GET[ 'dl_hsb_image' ] != "" ) {
  $dl_hsb_id = $_GET[ 'id' ];
  $dl_hsb_image = $_GET[ 'dl_hsb_image' ];
  $updated_date = date( 'Y-m-d H:i:s' );
  $updated_by = $_SESSION[ 'adm_id' ];

  if ( $_GET[ 'dl_hsb_image' ] != "" ) {
    unlink( 'img/dl_hsb_files/' . $dl_hsb_image );
     
    $dl_hsb_id = $_GET[ 'id' ];
    if ( isset( $_GET[ 'dl_hsb_image' ] ) ) {
      $dl_hsb_image = "";
      $sql_daily_hisab_updt_del = "UPDATE daily_hisab_detail SET dl_hsb_image='" . $dl_hsb_image . "', updated_by='" . $updated_by . "', updated_date='" . $updated_date . "' WHERE dl_hsb_id=" . $dl_hsb_id;
      if ( $con->query( $sql_daily_hisab_updt_del ) === TRUE ) {
        header( 'Location: daily_hisab_edit.php?dl_hsb_id=' . $dl_hsb_id );
      }
    }

  }
}
?>
