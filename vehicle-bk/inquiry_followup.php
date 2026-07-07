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
if ( !in_array( "3", $md_right ) ) {
  header( 'Location: insurance_dashboard.php' );
}
// Check Module Rights

$inq_id=$_GET["inq_id"];
$query_file = "SELECT * FROM inquiry_detail ld where ld.inq_status!=3 and ld.inq_action IN (1,2,3) and ld.inq_id=".$inq_id;
$result_query = $con->query($query_file);
$row_file=$result_query->fetch_object();
// echo $inq_id; exit;
if ( isset( $_POST[ "submit" ] ) ) {
  $branch_id = $_SESSION[ 'adm_branch' ];
  $inqflp_date = addslashes( $_POST[ "inqflp_date" ] );
  if (empty($_POST["inqflp_reminder_date"])){
    $inqflp_reminder_date = NULL;
  }
  else{    
      $inqflp_reminder_date = addslashes( $_POST[ "inqflp_reminder_date" ] );
  }
  $inqflp_notes = addslashes( $_POST[ "inqflp_notes" ] );
  $inqflp_status = 1;
  $added_date = date( 'Y-m-d H:i:s' );
  $updated_date = date( 'Y-m-d H:i:s' );
  $added_by = $_SESSION[ 'adm_id' ];
  $updated_by = $_SESSION[ 'adm_id' ];

  $sql_expe_ins = "INSERT INTO inq_flp_detail (branch_id, inq_id, inqflp_date, inqflp_reminder_date, inqflp_notes, added_by, updated_by, inqflp_status, added_date, updated_date) VALUES ('" . $branch_id . "','" . $inq_id . "','" . $inqflp_date . "','" . $inqflp_reminder_date . "', '" . $inqflp_notes . "', '" . $added_by . "','" . $updated_by . "','" . $inqflp_status . "','" . $added_date . "','" . $updated_date . "')";
  // echo $sql_expe_ins; exit;
  if ( $con->query( $sql_expe_ins ) === TRUE ) {
    // header( 'Location: inqflp_view.php?flag=1' );
  } else {
    // header( 'Location: inqflp_add.php' );
  }
}

$query_followup = "SELECT * FROM inq_flp_detail td, admin_login al  where td.inq_id=".$inq_id." and td.branch_id=".$_SESSION[ 'adm_branch' ]." and al.adm_id=td.added_by  ORDER BY td.inqflp_id DESC";


?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<meta name="author" content="">
<link rel="shortcut icon" href="img/favicon.png" type="image/png">
<title>Follow Up - <?php echo $row_file->inq_name."(".$row_file->inq_code_no.")"; ?> - <?php echo $meta_title; ?></title>
<link href="css/style.default.css" rel="stylesheet">
<link href="css/jquery.datatables.css" rel="stylesheet">
<link href="css/prettyPhoto.css" rel="stylesheet">
<script src="js/jquery-1.11.1.min.js"></script> 
<!--<script src="js/new-jquery-3.3.1.js"></script>--> 
<script src="js/new-table.js"></script>
<link href="css/new-table.css" rel="stylesheet">
<link rel="stylesheet" href="css/bootstrap-wysihtml5.css" />
<script>
    function validation() {
      var a = document.getElementById("password").value;
      var b = document.getElementById("confirmPassword").value;
      if (a !== b) {
        alert("New password and Confirm password not mached");
        document.getElementById('password').focus();
        return false;
      }
    }
  </script> 
<style>
  .blink_me {
  animation: blinker 1s linear infinite;
}

@keyframes blinker {
  50% {
    opacity: 0;
  }
}
</style>
<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.3/jquery.min.js"></script>
</head>

<body>
<!-- Preloader -->
<div id="preloader">
  <div id="status"><i class="fa fa-spinner fa-spin"></i></div>
</div>
<section>
<div class="leftpanel">
  <div class="logopanel">
    <h1><span>[</span> bracket <span>]</span></h1>
  </div>
  <!-- logopanel -->
  <?php include("left-column.php"); ?>
  <!-- leftpanelinner --> 
</div>
<!-- leftpanel -->
<div class="mainpanel">
  <?php include("header.php");?>
 <div class="pageheader">
  <h2><i class="fa fa-plus"></i> Follow Up - <?php  echo  $row_file->inq_name."(".$row_file->inq_code_no.")"; ?></h2>
   
</div>
<div class="contentpanel">
  <div class="row">
    <div class="col-md-12">
      <form method="post" name="frmadmin_changepwd" enctype="multipart/form-data" id="" class="" action="">
        <div class="panel panel-default">
          <div class="panel-heading">
            <div class="panel-btns">
              <a href="" class="panel-close">&times;</a>
              <a href="" class="minimize">&minus;</a>
            </div>
            <h4 class="panel-title">Follow Up Details</h4>
            <p>Please set followup details here</p>
          </div>
          <div class="panel-body">
          <div class="form-group">
            <label>Date <span class="asterisk">*</span></label>
            <div>
              <input type="date" name="inqflp_date" class="form-control" value="<?php $datend = new DateTime(); echo $datend->format('Y-m-d'); ?>" required />
            </div>
          </div>

          <div class="form-group">
            <label>Reminder Date </label>
            <div>
              <input type="date" name="inqflp_reminder_date" class="form-control" />
            </div>
          </div>

          <div class="form-group">
            <label class="control-label">Notes <span class="asterisk">*</span></label>
            <div>
              <textarea name="inqflp_notes" required class="form-control" cols="30" rows="3" placeholder="ex: Type message..."></textarea>
            </div>
          </div>

          <div class="panel-footer">
            <div class="row">
              <div class="col-sm-9 col-sm-offset-3">
                <input type="submit" name="submit" value="Submit" class="btn btn-primary" onClick="return validation();">
                <button type="reset" class="btn btn-default">Reset </button>
              </div>
            </div>
          </div>
        </div>

          <!-- <div class="panel-body">
            <div class="form-group col-sm-12 col-md-12 col-lg-12 col-xs-12">
              <label>Date <span class="asterisk">*</span>
              </label>
              <div class="col-sm-3">
                <input type="date" name="inqflp_date" class="form-control" value="
									<?php // $datend   = new DateTime(); echo $datend->format('Y-m-d'); ?>" required />
              </div>
            </div>
            <div class="form-group col-sm-12 col-md-12 col-lg-12 col-xs-12">
              <label>Reminder Date </label>
              <div class="col-sm-3">
                <input type="date" name="inqflp_reminder_date" class="form-control" />
              </div>
            </div>
            <div class="form-group col-sm-12 col-md-12 col-lg-12 col-xs-12">
              <label class="col-sm-3 control-label">Notes <span class="asterisk">*</span>
              </label>
              <div class="col-sm-9">
                <textarea name="inqflp_notes" required class="form-control" cols="30" rows="3" placeholder="ex: Type message..."></textarea>
              </div>
            </div>
            <div class="panel-footer">
              <div class="row">
                <div class="col-sm-9 col-sm-offset-3">
                  <input type="submit" name="submit" value="Submit" class="btn btn-primary" onClick="return validation();">
                  <button type="reset" class="btn btn-default">Reset </button>
                </div>
              </div>
            </div>
          </div> -->
          <!-- panel -->
        </div>
      </form>
      <!-- col-md-6 -->
      <div class="table-responsive">
        <table id="example" class="table table-success mb30 table-hover table-bordered display" style="color:#000;">
          <thead bgcolor="#82c21f">
            <tr>
              <th width="15%">Date</th>
              <th width="15%">Reminder</th>
              <th width="60%">Notes</th>
              <th width="15%">Admin</th>
            </tr>
          </thead>
          <tbody> <?php
              $result_followup=$con->query($query_followup);
              while($row_followup=$result_followup->fetch_object()) 
              { ?> <tr class="odd gradeX">
              <td> <?php
                $datend = new DateTime( $row_followup->inqflp_date );
                echo $datend->format( 'd-m-Y' );
                ?> </td> <?php
                $datend_ck = new DateTime( $row_followup->inqflp_reminder_date );
                $dt_ck = $datend_ck->format( 'Y-m-d' );

                 ?> <td <?php if(date('Y-m-d')==$dt_ck) { ?>style="color: red;" class="blink_me" <?php } ?>> <?php if($row_followup->inqflp_reminder_date!="") {
                $datend = new DateTime( $row_followup->inqflp_reminder_date );
                echo $datend->format( 'd-m-Y' );
                }
                ?> </td>
              <td> <?php echo $row_followup->inqflp_notes;?> </td>
              <td> <?php echo $row_followup->adm_username;?> </td>
            </tr> <?php } ?> </tbody>
        </table>
      </div>
    </div>
    <!--row -->
  </div>
  <!-- contentpanel -->
</div>
<!-- mainpanel -->
</section>
<script src="js/jquery-1.11.1.min.js"></script> 
<script src="js/jquery-migrate-1.2.1.min.js"></script> 
<script src="js/bootstrap.min.js"></script> 
<script src="js/modernizr.min.js"></script> 
<script src="js/jquery.sparkline.min.js"></script> 
<script src="js/toggles.min.js"></script> 
<script src="js/retina.min.js"></script> 
<script src="js/jquery.cookies.js"></script> 
<script src="js/select2.min.js"></script> 
<script src="js/jquery.validate.min.js"></script> 
<script src="js/wysihtml5-0.3.0.min.js"></script> 
<script src="js/bootstrap-wysihtml5.js"></script> 

<script src="js/custom.js"></script> 

</body>
</html>