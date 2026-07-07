<?php
include( "ka_include/session.php" );
include( "ka_include/common_function.php" );
include( "ka_include/ka_config.php" );
include( "ka_include/check_admin_login.php" );

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  if (isset($_POST['rto_adm_id']) && !empty($_POST['selected_rto_id'])) {
    $rto_adm_id = $_POST['rto_adm_id'];
    $selected_rto_id = $_POST['selected_rto_id'];
    // echo "Admin - ".$rto_adm_id."<br><br>Selected Rows: <br>"; 
    foreach ($selected_rto_id as $recordId) {
       // echo $recordId."<br>";
       $updated_date = date( 'Y-m-d H:i:s' );
       $updated_by = $_SESSION[ 'adm_id' ];
       $sql_rto_updt = "UPDATE rto_detail SET rto_adm_id='" . $rto_adm_id . "', updated_by='" . $updated_by . "', updated_date='" . $updated_date . "' WHERE rto_id=" . $recordId;
       $con->query($sql_rto_updt);

      }

      header( 'Location: vahan_view.php?flag=4' );
  } else {
    header( 'Location: vahan_view.php?flag=5' );
  }
  // exit;
  
  exit();
}
?>
