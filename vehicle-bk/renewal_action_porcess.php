<?php
include( "ka_include/session.php" );
include( "ka_include/common_function.php" );
include( "ka_include/ka_config.php" );
include( "ka_include/check_admin_login.php" );
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  if (isset($_POST['ren_adm_id']) && !empty($_POST['selected_ren_id'])) {
    $ren_adm_id = $_POST['ren_adm_id'];
    if($ren_adm_id=="DELETE") {
      $selected_ren_id = $_POST['selected_ren_id'];
      // echo "Admin - ".$ren_adm_id."<br><br>Selected Rows: <br>"; 
        foreach ($selected_ren_id as $recordId) {
         // echo $recordId."<br>";
         $updated_date = date( 'Y-m-d H:i:s' );
         $updated_by = $_SESSION[ 'adm_id' ];
         $sql_ren_updt = "UPDATE renewal_detail SET ren_status='3', updated_by='" . $updated_by . "', updated_date='".$updated_date."' WHERE ren_id=".$recordId;
         $con->query($sql_ren_updt);
        }
    } else {
      $selected_ren_id = $_POST['selected_ren_id'];
      // echo "Admin - ".$ren_adm_id."<br><br>Selected Rows: <br>"; 
      foreach ($selected_ren_id as $recordId) {
         // echo $recordId."<br>";
         $updated_date = date( 'Y-m-d H:i:s' );
         $updated_by = $_SESSION[ 'adm_id' ];
         $sql_ren_updt = "UPDATE renewal_detail SET ren_adm_id='" . $ren_adm_id . "', updated_by='" . $updated_by . "', updated_date='" . $updated_date . "' WHERE ren_id=" . $recordId;
         $con->query($sql_ren_updt);
  
        }
    }
    if($ren_adm_id=="DELETE") {
      header( 'Location: renewal_view.php?flag=6' );
    } else {
      header( 'Location: renewal_view.php?flag=4' );
    }
  } else {
    header( 'Location: renewal_view.php?flag=5' );
  }
  // exit;
  exit();
}
?>
