<?php
include( "ka_include/session.php" );
include( "ka_include/common_function.php" );
include( "ka_include/ka_config.php" );
include( "ka_include/check_admin_login.php" );
if ( $_SESSION[ 'adm_type' ] != 0 ) {
  header( 'Location: #' );
}
if ( !empty( $_GET[ 'agt_id' ] ) ) {
  $agt_id = $_GET[ 'agt_id' ];
  $updated_by = $_SESSION[ 'adm_id' ];
  $agt_updated = date( "Y-m-d H:i:s" );
  $sql_agent_updt = "UPDATE agent_detail SET agt_status='3', updated_by='" . $updated_by . "', agt_updated='" . $agt_updated . "' WHERE agt_id=" . $agt_id;
  $updated_qu = $con->query( $sql_agent_updt );
  header( 'Location: agent_view.php?flag=3' );
}
?>