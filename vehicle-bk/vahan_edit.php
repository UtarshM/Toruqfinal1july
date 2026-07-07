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
if ( !in_array( "7", $md_right ) ) {
  header( 'Location: rto_dashboard.php' );
}
// Check Module Rights

$rto_id = $_GET[ 'rto_id' ];

if ( isset( $_POST[ "submit" ] ) ) {
  $branch_id = $_SESSION[ 'adm_branch' ];
  $rto_adm_id = addslashes( $_POST[ "rto_adm_id" ] );
  $rto_date = addslashes( $_POST[ "rto_date" ] );
  $rto_duedate = addslashes( $_POST[ "rto_duedate" ] );
  $rto_regno = addslashes( $_POST[ "rto_regno" ] );
  $rto_name = addslashes( $_POST[ "rto_name" ] );
  $rto_contact = addslashes( $_POST[ "rto_contact" ] );
  $rto_amount = addslashes( $_POST[ "rto_amount" ] );
  $rto_credit = addslashes( $_POST[ "rto_credit" ] );
  $rto_debit = addslashes( $_POST[ "rto_debit" ] );
  $rto_description = addslashes( $_POST[ "rto_description" ] ); 
  $rto_status = addslashes( $_POST[ "rto_status" ] );
  $rto_action = addslashes( $_POST[ "rto_action" ] );
  $pen_res_id = addslashes( $_POST[ "pen_res_id" ] );
  $rto_stage_no = addslashes( $_POST[ "rto_stage_no" ] );
  $rto_stage_name = addslashes( $_POST[ "rto_stage_name" ] );
  $updated_date = date( 'Y-m-d H:i:s' );
  $updated_by = $_SESSION[ 'adm_id' ];

  $sql_expe_updt = "UPDATE rto_detail SET rto_adm_id='" . $rto_adm_id . "', rto_date='" . $rto_date . "', rto_duedate='" . $rto_duedate . "', rto_regno='".$rto_regno."',  rto_name='" . $rto_name."', rto_contact='".$rto_contact."', rto_amount='".$rto_amount."', rto_credit='".$rto_credit."', rto_debit='".$rto_debit."', rto_description='".$rto_description."', updated_by='" . $updated_by . "', rto_status='" . $rto_status . "', rto_action='" . $rto_action . "', pen_res_id='" . $pen_res_id . "', rto_stage_no='" . $rto_stage_no . "', rto_stage_name='" . $rto_stage_name . "', updated_date='" . $updated_date . "' WHERE rto_id=" . $rto_id;
  if ( $con->query( $sql_expe_updt ) === TRUE ) {
    header( 'Location: vahan_view.php?flag=2' ); exit;
  } else {
    header( 'Location: vahan_edit.php?rto_id='.$rto_id.'' );  exit;
  }
}

$query_state_detail = "SELECT * FROM rto_detail ld where ld.rto_id=" . $rto_id." and rto_status!='3' ";
$result_query = $con->query( $query_state_detail );
$row_state = $result_query->fetch_object();
if($row_state->branch_id != $_SESSION['adm_branch']) {
  header( 'Location: rto_dashboard.php' );
}
if ( $_SESSION[ 'adm_type' ] != 0 ) { 
if($row_state->rto_adm_id != $_SESSION['adm_id']) {
  header( 'Location: rto_dashboard.php' );
}
}
if($row_state->service_id != 2) {
  header( 'Location: rto_dashboard.php' );
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<meta name="author" content="">
<link rel="shortcut icon" href="img/favicon.png" type="image/png">
<title>Vahan Work Edit   -<?php echo $meta_title; ?></title>
<link href="css/style.default.css" rel="stylesheet">
<link rel="stylesheet" href="css/bootstrap-wysihtml5.css" />
<link href="css/prettyPhoto.css" rel="stylesheet">
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
    <?php include("header.php"); ?>
    <div class="pageheader">
      <h2><i class="fa fa-pen"></i> Vahan Work Edit </h2>
      <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
        <ol class="breadcrumb">
          <li><a style="color:#1C1B17;" href="rto_dashboard.php">Dashboard</a></li>
          <li class="active">Vahan Work Edit </li>
        </ol>
      </div>
    </div>
    <div class="contentpanel">
      <div class="row">
        <div class="col-md-12">
          <form method="post" name="frmadmin_changepwd" enctype="multipart/form-data" id="" class="" action="">
            <div class="panel panel-default">
              <div class="panel-heading">
                <div class="panel-btns"> <a href="" class="panel-close">&times;</a> <a href="" class="minimize">&minus;</a> </div>
                <h4 class="panel-title">Vahan Work Details</h4>
                <p>Please set vahan work details here</p>
              </div>
              <div class="panel-body">
                 
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">Vahan Work Code <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="text" disabled class="form-control" placeholder="" value="<?php echo $row_state->rto_code_no; ?>"  />
                  </div>
                </div>
                
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">Date <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="date" name="rto_date" id="rto_date" value="<?php $datend   = new DateTime($row_state->rto_date); echo $datend->format('Y-m-d'); ?>" class="form-control" required <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?> />
                  </div>
                </div>
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">Due Date <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <input type="date" name="rto_duedate" id="rto_duedate" value="<?php $datend   = new DateTime($row_state->rto_duedate); echo $datend->format('Y-m-d'); ?>" class="form-control" required <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?> />
                  </div>
                </div>
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Register No. <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="text" name="rto_regno" class="form-control" value="<?php echo $row_state->rto_regno ?>" required placeholder="GJ01CV0267" <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?> />
              </div>
            </div>
                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Name <span class="asterisk">*</span> </label>
              <div class="col-sm-9">
                <input type="text" name="rto_name" class="form-control" value="<?php echo $row_state->rto_name ?>" placeholder="Jakirhusen Parasara" required <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?> />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Mobile No.  <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <input type="phone" name="rto_contact" value="<?php echo $row_state->rto_contact ?>" class="form-control" pattern="\d*" minlength="10" maxlength="10"  required placeholder="9898569898" <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?> />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Amount <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <input type="phone" name="rto_amount" value="<?php if($row_state->rto_amount!="") { echo $row_state->rto_amount; } else { echo "0"; } ?>" class="form-control" id="rto_amount" pattern="\d*" min="0" required placeholder="500" <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?> />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Credit [Jama] <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <input type="phone" name="rto_credit" value="<?php if($row_state->rto_credit!="") { echo $row_state->rto_credit; } else { echo "0"; } ?>" class="form-control" id="rto_credit" pattern="\d*" min="0" required placeholder="500" <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?> />
              </div>
            </div>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Debit [Baki] <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <input type="phone" name="rto_debit" value="<?php if($row_state->rto_debit!="") { echo $row_state->rto_debit; } else { echo "0"; } ?>" class="form-control" id="rto_debit" readonly pattern="\d*" min="0" required placeholder="500" <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?> />
              </div>
            </div>
           <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Task Description <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <textarea name="rto_description" class="form-control" cols="30" rows="2" placeholder="ex: Type description..." required <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?> ><?php echo $row_state->rto_description ?></textarea>                 
              </div>
            </div>

           <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">Staff<span class="asterisk">*</span> </label>
                  <div class="col-sm-9">
                    <select required class="form-control" name="rto_adm_id" <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?>>
                      <option value="" >Select Staff</option>
                       <?php
                      $query_admin = "SELECT * FROM admin_login WHERE adm_status=1 and adm_id!=1 and branch_id=".$_SESSION[ 'adm_branch' ]."";
                      $result_admin = $con->query( $query_admin );
                      while ( $row_admin = $result_admin->fetch_object() ) {
                        ?>
                      <option value="<?php echo $row_admin->adm_id?>" <?php if ($row_admin->adm_id==$row_state->rto_adm_id) { ?>selected<?php } ?> > <?php echo $row_admin->adm_username?> </option>
                      <?php } ?>
                    </select>
                  </div>
                </div>

                <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Action <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select required class="form-control" name="rto_action">
                  <option value="">Select Action</option>
                  <option value="1" <?php if ($row_state->rto_action == 1) { ?>selected<?php } ?>>Pending</option>
                  <option value="2" <?php if ($row_state->rto_action == 2) { ?>selected<?php } ?>>Completed</option>
                  <option value="3" <?php if ($row_state->rto_action == 3) { ?>selected<?php } ?>>Document Delivered</option>
                </select>
              </div>
            </div>
            <?php if ($row_state->rto_action == 1) {  ?>
            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12" id="pen_show_2">
              <label class="col-sm-3 control-label">Reason <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select class="form-control" name="pen_res_id">
                  <option value="">Select Reason</option>
                  <?php
                  $query_rejres = "SELECT * FROM pen_res_detail WHERE pen_res_status=1";
                  $result_rejres = $con->query( $query_rejres );
                  while ( $row_rejres = $result_rejres->fetch_object() ) {
                  ?>
                  <option <?php if ($row_rejres->pen_res_id==$row_state->pen_res_id) { ?>selected<?php } ?> value="<?php echo $row_rejres->pen_res_id ?>"><?php echo $row_rejres->pen_res_name ?></option>
                  <?php } ?>
                </select>
              </div>
            </div>
            <?php } else { ?>
              <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12" id="pen_show">
              <label class="col-sm-3 control-label">Reason <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select class="form-control" name="pen_res_id">
                  <option value="">Select Reason</option>
                  <?php
                  $query_rejres = "SELECT * FROM pen_res_detail WHERE pen_res_status=1";
                  $result_rejres = $con->query( $query_rejres );
                  while ( $row_rejres = $result_rejres->fetch_object() ) {
                  ?>
                  <option value="<?php echo $row_rejres->pen_res_id ?>"><?php echo $row_rejres->pen_res_name ?></option>
                  <?php } ?>
                </select>
              </div>
            </div>
              <?php } ?>

              <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Stage <span class="asterisk">*</span></label>
              <div class="col-sm-4">
                <select class="form-control" name="rto_stage_no" required>
                  <option value="">Select Stage</option>
                  <option value="1" <?php if($row_state->rto_stage_no==1) {?>selected<?php } ?>>01</option>
                  <option value="2" <?php if($row_state->rto_stage_no==2) {?>selected<?php } ?>>02</option>
                  <option value="3" <?php if($row_state->rto_stage_no==3) {?>selected<?php } ?>>03</option>
                  <option value="4" <?php if($row_state->rto_stage_no==4) {?>selected<?php } ?>>04</option>
                  <option value="5" <?php if($row_state->rto_stage_no==5) {?>selected<?php } ?>>05</option>
                 </select>
              </div>
              <div class="col-sm-5">
              <input type="text" name="rto_stage_name" value="<?php echo $row_state->rto_stage_name; ?>" class="form-control" required placeholder="Insurance" />
              </div>
            </div>


            <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
                  <label class="col-sm-3 control-label">Status <span class="asterisk">*</span></label>
                  <div class="col-sm-9">
                    <select required class="form-control" name="rto_status" <?php if ( $_SESSION['adm_type']!=0) { ?> readonly <?php } ?>>
                      <?php
                      $query_status = "SELECT * FROM status_detail WHERE status_id!=3";
                      $result_status = $con->query( $query_status );
                      while ( $row_status = $result_status->fetch_object() ) {
                        ?>
                      <option <?php if ($row_status->status_id == $row_state->rto_status) { ?>selected<?php } ?> value="<?php echo $row_status->status_id ?>"> <?php echo $row_status->status_name ?> </option>
                      <?php } ?>
                    </select>
                  </div>
                </div>
              </div>
              <!-- panel-body -->
              <div class="panel-footer">
                <div class="row">
                  <div class="col-sm-12 col-lg-12 col-md-12 col-xs-12 ml_15">
                    <input type="submit" name="submit" value="Edit " class="btn btn-primary" onClick="return validation();">
                    <input type="reset" style="background:#FFFFFF" class="btn btn-default" value="Cancel" onClick="location.href='vahan_view.php'">
                  </div>
                </div>
              </div>
            </div>
            <!-- panel -->
          </form>
        </div>
        <!-- col-md-6 --> 
      </div>
      <!--row --> 
    </div>
    <!-- contentpanel --> 
  </div>
  <!-- mainpanel --> 
  <!-- rightpanel --> 
</section>
<script src="js/jquery-1.11.1.min.js"></script> 
<script src="js/jquery-migrate-1.2.1.min.js"></script> 
<script src="js/bootstrap.min.js"></script> 
<script src="js/modernizr.min.js"></script> 
<script src="js/jquery.sparkline.min.js"></script> 
<script src="js/toggles.min.js"></script> 
<script src="js/retina.min.js"></script> 
<script src="js/jquery.cookies.js"></script> 
<script src="js/jquery.prettyPhoto.js"></script> 
<script src="js/wysihtml5-0.3.0.min.js"></script> 
<script src="js/bootstrap-wysihtml5.js"></script> 
<script src="js/custom.js"></script> 
<script>
    $(document).ready(function() {
      // Hide the "pen_show" div initially
      $("#pen_show").hide();

      // Listen for changes in the "rto_action" select element
      $("select[name='rto_action']").change(function() {
        // Get the selected value
        var selectedValue = $(this).val();

        // Check if the selected value is '2' (Rejected)
        if (selectedValue === '1') {
          // Show the "pen_show" div
          $("#pen_show").show();
          // Make the "pen_res_id" select required
          $("select[name='pen_res_id']").prop('required', true);
        } else {
          // Hide the "pen_show" div
          $("#pen_show").hide();
          // Remove the required attribute from the "pen_res_id" select
          $("select[name='pen_res_id']").prop('required', false);
        }
      });
    });
  </script>
<script>
    // Function to calculate pending amount
    function calculatePendingAmount() {
      var amount = parseFloat(document.getElementById('rto_amount').value) || 0;
      var credit = parseFloat(document.getElementById('rto_credit').value) || 0;

      if (credit > amount) {
        alert("Credit cannot be greater than the total amount.");
        document.getElementById('rto_credit').value = amount.toFixed(2);
        credit = amount;
      }

      var debit = amount - credit;
      document.getElementById('rto_debit').value = debit.toFixed(2);
    }

    // Attach the function to input change events
    document.getElementById('rto_amount').addEventListener('input', calculatePendingAmount);
    document.getElementById('rto_credit').addEventListener('input', calculatePendingAmount);
  </script>

</body>
</html>