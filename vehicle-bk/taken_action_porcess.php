<?php
include( "ka_include/session.php" );
include( "ka_include/common_function.php" );
include( "ka_include/ka_config.php" );
include( "ka_include/check_admin_login.php" );
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  if (isset($_POST['tkn_adm_id']) && !empty($_POST['selected_tkn_id'])) {
    $tkn_adm_id = $_POST['tkn_adm_id'];
    if($tkn_adm_id=="DELETE") {
      $selected_tkn_id = $_POST['selected_tkn_id'];
      // echo "Admin - ".$tkn_adm_id."<br><br>Selected Rows: <br>"; 
      foreach ($selected_tkn_id as $recordId) {
        // echo $recordId."<br>";
        $updated_date = date( 'Y-m-d H:i:s' );
        $updated_by = $_SESSION[ 'adm_id' ];
        $sql_tkn_updt = "UPDATE taken_detail SET tkn_status='3', updated_by='" . $updated_by . "', updated_date='" . $updated_date . "' WHERE tkn_id=" . $recordId;
        $con->query($sql_tkn_updt);
        }
    } else {
      $selected_tkn_id = $_POST['selected_tkn_id'];
      // echo "Admin - ".$tkn_adm_id."<br><br>Selected Rows: <br>"; 
      foreach ($selected_tkn_id as $recordId) {
        // echo $recordId."<br>";
        $updated_date = date( 'Y-m-d H:i:s' );
        $updated_by = $_SESSION[ 'adm_id' ];
        $sql_tkn_updt = "UPDATE taken_detail SET tkn_adm_id='" . $tkn_adm_id . "', updated_by='" . $updated_by . "', updated_date='" . $updated_date . "' WHERE tkn_id=" . $recordId;
        $con->query($sql_tkn_updt);
        }
    }
    if($tkn_adm_id=="DELETE") {
      header( 'Location: taken_view.php?flag=6' );
    } else {
      header( 'Location: taken_view.php?flag=4' );
    }
  } else {
    header( 'Location: taken_view.php?flag=5' );
  }
  // exit;
  exit();
}
?>
