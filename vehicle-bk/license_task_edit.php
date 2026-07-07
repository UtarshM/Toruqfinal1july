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

$rto_id = $_GET[ 'rto_id' ];
$rtsk_id = $_GET[ 'rtsk_id' ];

$query_rto_detail = "SELECT * FROM rto_detail ld where ld.rto_id=" . $rto_id." and rto_status!='3' ";
$result_rto = $con->query( $query_rto_detail );
$row_rto = $result_rto->fetch_object();

if ( isset( $_POST[ "submit" ] ) ) {
  $rtsk_notes = addslashes( $_POST[ "rtsk_notes" ] ); 
  $rtsk_action_id = addslashes( $_POST[ "rtsk_action_id" ] );
  $updated_date = date( 'Y-m-d H:i:s' );
  $updated_by = $_SESSION[ 'adm_id' ];

  $sql_expe_updt = "UPDATE rto_task_detail SET rtsk_notes='".$rtsk_notes."', rtsk_action_id='" . $rtsk_action_id . "', updated_by='" . $updated_by . "', updated_date='" . $updated_date . "' WHERE rtsk_id=" . $rtsk_id;
  if ( $con->query( $sql_expe_updt ) === TRUE ) {
    header( 'Location: license_task_view.php?flag=2&rto_id='.$rto_id ); exit;
  } else {
    header( 'Location: license_task_edit.php?rtsk_id='.$rtsk_id.'&rto_id='.$rto_id.'' );  exit;
  }
}

$query_state_detail = "SELECT * FROM rto_task_detail ld where ld.rtsk_id=".$rtsk_id." and rtsk_status!='3' ";
$result_query = $con->query( $query_state_detail );
$row_state = $result_query->fetch_object();
// echo $query_state_detail; exit;
if($row_state->branch_id != $_SESSION['adm_branch']) {
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
<title>License Task Edit - <?php echo $row_rto->rto_name." - ".$row_rto->rto_contact; ?>   -<?php echo $meta_title; ?></title>
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
      <h2><i class="fa fa-pen"></i> License Task Edit [<?php echo $row_rto->rto_name." - ".$row_rto->rto_contact; ?> ] </h2>
      <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
        <ol class="breadcrumb">
          <li><a style="color:#1C1B17;" href="rto_dashboard.php">Dashboard</a></li>
          <li><a style="color:#1C1B17;" href="license_view.php"> License Work List </a></li>
          <li><a style="color:#1C1B17;" href="license_task_view.php?rto_id=<?php echo $rto_id; ?>">  License Tasks  </a></li>
          <li class="active">License Task Edit [<?php echo $row_rto->rto_name." - ".$row_rto->rto_contact; ?> ] </li>
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
                <h4 class="panel-title">License Task Details</h4>
                <p>Please set license work details here</p>
              </div>
              <div class="panel-body">
                 
                 
              <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12" id="pen_show_2">
              <label class="col-sm-3 control-label">Service <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select class="form-control" disabled>
                  <option value="">Select Service</option>
                  <?php
                  $query_service = "SELECT * FROM service_detail WHERE service_status=1";
                  $result_service = $con->query( $query_service );
                  while ( $row_service = $result_service->fetch_object() ) {
                  ?>
                  <option <?php if ($row_service->service_id==$row_state->service_id) { ?>selected<?php } ?> value="<?php echo $row_service->service_id ?>"><?php echo $row_service->service_name ?></option>
                  <?php } ?>
                </select>
              </div>
            </div>
            
           <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12">
              <label class="col-sm-3 control-label">Task Description <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <textarea name="rtsk_notes" class="form-control" cols="30" rows="2" placeholder="ex: Type description..." required><?php echo $row_state->rtsk_notes ?></textarea>                 
              </div>
            </div>

            
             <div class="form-group col-md-12 col-lg-12 col-sm-12 col-xs-12" id="pen_show_2">
              <label class="col-sm-3 control-label">Status (Action) <span class="asterisk">*</span></label>
              <div class="col-sm-9">
                <select class="form-control" name="rtsk_action_id">
                  <option value="">Select Status (Action)</option>
                  <?php
                  $query_action = "SELECT * FROM rto_task_action_detail WHERE rtsk_action_status=1";
                  $result_action = $con->query( $query_action );
                  while ( $row_action = $result_action->fetch_object() ) {
                  ?>
                  <option <?php if ($row_action->rtsk_action_id==$row_state->rtsk_action_id) { ?>selected<?php } ?> value="<?php echo $row_action->rtsk_action_id ?>"><?php echo $row_action->rtsk_action_name ?></option>
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
                    <input type="reset" style="background:#FFFFFF" class="btn btn-default" value="Cancel" onClick="location.href='license_task_view.php?rto_id=<?php echo $rto_id; ?>'">
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