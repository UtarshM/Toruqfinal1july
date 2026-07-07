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
if ( $_GET[ 'oexp_image' ] != "" ) {
  $oexp_id = $_GET[ 'id' ];
  $oexp_image = $_GET[ 'oexp_image' ];
  $updated_date = date( 'Y-m-d H:i:s' );
  $updated_by = $_SESSION[ 'adm_id' ];

  if ( $_GET[ 'oexp_image' ] != "" ) {
    unlink( 'img/oexp_files/' . $oexp_image );
     
    $oexp_id = $_GET[ 'id' ];
    if ( isset( $_GET[ 'oexp_image' ] ) ) {
      $oexp_image = "";
      $sql_office_expenses_updt_del = "UPDATE office_expenses_detail SET oexp_image='" . $oexp_image . "', updated_by='" . $updated_by . "', updated_date='" . $updated_date . "' WHERE oexp_id=" . $oexp_id;
      if ( $con->query( $sql_office_expenses_updt_del ) === TRUE ) {
        header( 'Location: office_expenses_edit.php?oexp_id=' . $oexp_id );
      }
    }

  }
}
?>
