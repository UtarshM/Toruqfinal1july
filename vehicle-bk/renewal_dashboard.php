<?php
include( "ka_include/session.php" );
include( "ka_include/common_function.php" );
include( "ka_include/ka_config.php" );
include( "ka_include/check_admin_login.php" );
$tod_date = date("Y-m-d");
// Check Module Rights
$query_module_detail = "SELECT * FROM admin_login ld where adm_id='" . $_SESSION[ 'adm_id' ] . "' and adm_status=1";
$module_query = $con->query( $query_module_detail );
$row_md_id = $module_query->fetch_array();

$md_right = explode( ",", $row_md_id[ 'md_id' ] );
if ( in_array( "3", $md_right ) ) {
  if ( $_SESSION[ 'adm_type' ] == 0 ) { // Admin 
    $query_followup = "SELECT * FROM ren_flp_detail td, admin_login al, renewal_detail fd  where td.ren_id=fd.ren_id and td.branch_id=".$_SESSION[ 'adm_branch' ]." and al.adm_id=fd.ren_adm_id and Date(td.renflp_reminder_date) = '$tod_date'  ORDER BY td.renflp_id DESC";
    $result_flow_tot = $con->query( $query_followup );
    $total_records_flow = $result_flow_tot->num_rows;
    
    $query_followup_tk = "SELECT * FROM tkn_flp_detail td, admin_login al, taken_detail fd  where td.tkn_id=fd.tkn_id and td.branch_id=".$_SESSION[ 'adm_branch' ]." and al.adm_id=fd.tkn_adm_id and Date(td.tknflp_reminder_date) = '$tod_date'  ORDER BY td.tknflp_id DESC";
    $result_flow_tk_tot = $con->query( $query_followup_tk );
    $total_records_flow_tk = $result_flow_tk_tot->num_rows;
  } else {
    $query_followup = "SELECT * FROM ren_flp_detail td, admin_login al, renewal_detail fd  where td.ren_id=fd.ren_id and td.branch_id=".$_SESSION[ 'adm_branch' ]." and fd.ren_adm_id=".$_SESSION[ 'adm_id' ]." and al.adm_id=fd.ren_adm_id and Date(td.renflp_reminder_date) = '$tod_date'  ORDER BY td.renflp_id DESC";
    $result_flow_tot = $con->query( $query_followup );
    $total_records_flow = $result_flow_tot->num_rows;
   
    $query_followup_tk = "SELECT * FROM tkn_flp_detail td, admin_login al, taken_detail fd  where td.tkn_id=fd.tkn_id and td.branch_id=".$_SESSION[ 'adm_branch' ]." and fd.tkn_adm_id=".$_SESSION[ 'adm_id' ]." and al.adm_id=fd.tkn_adm_id and Date(td.tknflp_reminder_date) = '$tod_date'  ORDER BY td.tknflp_id DESC";
    $result_flow_tk_tot = $con->query( $query_followup_tk );
    $total_records_flow_tk = $result_flow_tk_tot->num_rows;
}
}  
// echo $total_records_flow; exit;
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<meta name="author" content="">
<link rel="shortcut icon" href="img/favicon.png" type="image/png">
<title>Torque Auto Advisor Dashboard  - <?php echo $meta_title; ?> </title>
<link href="css/style.default.css" rel="stylesheet">
<link href="css/jquery.datatables.css" rel="stylesheet">
<script>
function renewal_followup(ren_id)
{
  window.open("renewal_followup.php?ren_id="+ren_id,"","height=700,width=700,left=700,top=200");
}
function taken_followup(tkn_id)
{
  window.open("taken_followup.php?tkn_id="+tkn_id,"","height=700,width=700,left=700,top=200");
}
</script> 
<script src="js/jquery-1.11.1.min.js"></script> 
<!--<script src="js/new-jquery-3.3.1.js"></script>--> 
<script src="js/new-table.js"></script>
<link href="css/new-table.css" rel="stylesheet">
<script type="text/javascript">
$(document).ready(function() {
    // Setup - add a text input to each footer cell
    $('#example tfoot th').each( function () {
        var title = $(this).text();
        $(this).html( '<input type="text" placeholder="'+title+'" />' );
    } );
 
    // DataTable
    var table =  $('#example').DataTable();
    var table =  $('#example_two').DataTable();
    var table =  $('#example_three').DataTable();
 
    // Apply the search
    table.columns().every( function () {
        var that = this;
 
        $( 'input', this.footer() ).on( 'keyup change', function () {
            if ( that.search() !== this.value ) {
                that
                    .search( this.value )
                    .draw();
            }
        } );
    } );
} );
$(document).ready(function() {
    // Setup - add a text input to each footer cell
    $('#example2 tfoot th').each( function () {
        var title = $(this).text();
        $(this).html( '<input type="text" placeholder="'+title+'" />' );
    } );
 
    // DataTable
    var table = $('#example2').DataTable();
 
    // Apply the search
    table.columns().every( function () {
        var that = this;
 
        $( 'input', this.footer() ).on( 'keyup change', function () {
            if ( that.search() !== this.value ) {
                that
                    .search( this.value )
                    .draw();
            }
        } );
    } );
} );
</script>
<style>
tfoot input {
    width: 100%;
    padding: 3px;
    box-sizing: border-box;
}
</style>
</head>
<body>
<!-- Preloader -->
<div id="preloader">
  <div id="status"><i class="fa fa-spinner fa-spin"></i></div>
</div>
<section>
  <?php include("left-column.php");?>
  <div class="mainpanel">
    <?php include("header.php");?>
    <div class="pageheader">
      <h2><i class="fa fa-home"></i> Torque Auto Advisor Dashboard</h2>
      <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
        <ol class="breadcrumb">
          <li><a style="color:#1C1B17" href="#">Home</a></li>
          <li class="active">Torque Auto Advisor Dashboard</li>
        </ol>
      </div>
    </div>
    <div class="contentpanel">
      <div class="panel panel-default">
        <div class="panel-body">
           <div class="table-responsive col-md-12 col-lg-12 col-sm-12 col-xs-12">

           <h3 class="text-center" style="font-weight: bold; color: #DA261C;">Today's Follow-up - Renewal</h3>


    <table id="example" class="table table-success mb30 table-hover table-bordered display" style="color:#000;" >
              <thead bgcolor="#82c21f">
                <tr>
                <th width="25%">Renewal</th>
                  <th width="50%">Notes</th>
                  <th width="10%">Contact</th>
                  <th width="15%">Assign</th>
                  <th  width="15%">Action</th>
                </tr>
              </thead>
              <tbody>
                
              <?php // 
              $result_followup=$con->query($query_followup);
              while($row_followup=$result_followup->fetch_object()) 
              { ?>
                <tr class="odd gradeX">
                  <td><?php  echo $row_followup->ren_code_no." - ".$row_followup->ren_name;?></td>
                  <td><?php  echo $row_followup->renflp_notes;?></td>
                  <td><?php  echo $row_followup->ren_contact;?></td>
                  <td><?php  echo $row_followup->adm_username;?></td>
                  <td  width="17%"><code> <a  title="Follow Up"style="color:#1C1B17; cursor:pointer; " onClick="return renewal_followup(<?php echo $row_followup->ren_id?>);" ><i class="fa fa-comment"></i></a> | <a title="Go To Renewal Details" target="_blank" style="color:green;" href="renewal_edit.php?ren_id=<?php echo $row_followup->ren_id?>"><i class="fa fa-eye"></i></a> <code></td>
                </tr>
                <?php  } ?>

              </tbody>
              <tfoot>
                <tr>
                <th width="25%">Renewal</th>
                  <th width="50%">Notes</th>
                  <th width="10%">Contact</th>
                  <th width="15%">Assign</th>
                  <th  width="15%">Action</th>
                </tr>
              </tfoot>
            </table>

            </div>
        </div>
      </div>
    </div>
    <div class="contentpanel">
      <div class="panel panel-default">
        <div class="panel-body">
           <div class="table-responsive col-md-12 col-lg-12 col-sm-12 col-xs-12">

           <h3 class="text-center" style="font-weight: bold; color: #DA261C;">Today's Follow-up - Taken</h3>


    <table id="example_two" class="table table-success mb30 table-hover table-bordered display" style="color:#000;" >
              <thead bgcolor="#82c21f">
                <tr>
                <th width="25%">Taken</th>
                  <th width="50%">Notes</th>
                  <th width="10%">Contact</th>
                  <th width="15%">Assign</th>
                  <th  width="15%">Action</th>
                </tr>
              </thead>
              <tbody>
                
              <?php // 
              $result_followup=$con->query($query_followup_tk);
              while($row_followup=$result_followup->fetch_object()) 
              { ?>
                <tr class="odd gradeX">
                  <td><?php  echo $row_followup->tkn_code_no." - ".$row_followup->tkn_name;?></td>
                  <td><?php  echo $row_followup->tknflp_notes;?></td>
                  <td><?php  echo $row_followup->tkn_contact;?></td>
                  <td><?php  echo $row_followup->adm_username;?></td>
                  <td  width="17%"><code> <a  title="Follow Up"style="color:#1C1B17; cursor:pointer; " onClick="return taken_followup(<?php echo $row_followup->tkn_id?>);" ><i class="fa fa-comment"></i></a> | <a title="Go To Taken Details" target="_blank" style="color:green;" href="taken_edit.php?tkn_id=<?php echo $row_followup->tkn_id?>"><i class="fa fa-eye"></i></a> <code></td>
                </tr>
                <?php  } ?>

              </tbody>
              <tfoot>
                <tr>
                <th width="25%">Taken</th>
                  <th width="50%">Notes</th>
                  <th width="10%">Contact</th>
                  <th width="15%">Assign</th>
                  <th  width="15%">Action</th>
                </tr>
              </tfoot>
            </table>

            </div>
        </div>
      </div>
    </div>

    <!-- <div class="contentpanel">
      <div class="panel panel-default">
        <div class="panel-body">
          <?php //  if ( in_array( "4", $md_right ) ) { ?>
          <div class="table-responsive col-md-6 col-lg-6 col-sm-6 col-xs-12">
            <h3 class="text-center" style="font-weight: bold; color: #DA261C;">Today's Inquiry <a href="inquiry_add.php"  class="btn btn-primary" style="background-color: #DA261C !important; border-color: #DA261C !important;"> Add Inquiry </a> <a href="inquiry_view.php" class="btn btn-primary" style="background-color: #DA261C !important; border-color: #DA261C !important;"> View Inquiry </a></h3>
            <table id="example" class="table table-success mb30 table-hover table-bordered display" style="color:#000; background-color: #C8E8FF;" >
              <thead style="background-color: #C8E8FF;" >
                <tr style="background-color: #DA261C;">
                  <th style="background-color: #DA261C;"  width="5%">Inquiry </th>
                  <th style="background-color: #DA261C;" width="40%">Name</th>
                  <th style="background-color: #DA261C;" width="15%">Contact</th>
                  <th style="background-color: #DA261C;" width="15%">Loan</th>
                  <th style="background-color: #DA261C;" width="15%">By</th>
                </tr>
              </thead>
              <tbody>
                <?php // 
                // $result = $con->query( $query_inqu );
                // while ( $row_inqu = $result->fetch_object() ) {
                  ?>
                <tr class="odd gradeX" style="background-color: #C8E8FF;">
                  <td style="background-color: #C8E8FF;"><?php //  echo $row_inqu->inquiry_code_no;?></td>
                  <td style="background-color: #C8E8FF;"><a title="Edit" target="_blank" style="color:#000;" href="inquiry_edit.php?inquiry_id=<?php //  echo $row_inqu->inquiry_id?>"><?php //  echo $row_inqu->inquiry_name;?></a></td>
                  <td style="background-color: #C8E8FF;"><?php //  echo $row_inqu->inquiry_contact;?></td>
                  <td style="background-color: #C8E8FF;"><?php //  echo $row_inqu->service_name;?></td>
                  <td style="background-color: #C8E8FF;"><?php //  echo $row_inqu->adm_username;?></td>
                </tr>
                <?php //  } ?>
              </tbody>
            </table>
          </div>
          <div class="table-responsive col-md-6 col-lg-6 col-sm-6 col-xs-12">
            <h3 class="text-center" style="font-weight: bold; color: #ff7a70; margin-bottom: 25px;">Inquiry Reminder </h3>
            <table id="example_two" class="table table-success mb30 table-hover table-bordered display" style="color:#000; background-color: #C8E8FF;" >
              <thead style="background-color: #ff7a70;" >
                <tr style="background-color: #ff7a70;">
                  <th style="background-color: #ff7a70;"  width="5%">Inquiry </th>
                  <th style="background-color: #ff7a70;" width="40%">Name</th>
                  <th style="background-color: #ff7a70;" width="15%">Contact</th>
                  <th style="background-color: #ff7a70;" width="15%">Loan</th>
                  <th style="background-color: #ff7a70;" width="15%">By</th>
                </tr>
              </thead>
              <tbody>
                <?php // 
                // $result_rem = $con->query( $query_rem_inqu );
                // while ( $row_rem_inqu = $result_rem->fetch_object() ) {
                  ?>
                <tr class="odd gradeX" style="background-color: #C8E8FF;">
                  <td style="background-color: #C8E8FF;"><?php //  echo $row_rem_inqu->inquiry_code_no;?></td>
                  <td style="background-color: #C8E8FF;"><a title="Edit" target="_blank" style="color:#000;" href="inquiry_edit.php?inquiry_id=<?php //  echo $row_rem_inqu->inquiry_id?>"><?php //  echo $row_rem_inqu->inquiry_name;?></a></td>
                  <td style="background-color: #C8E8FF;"><?php //  echo $row_rem_inqu->inquiry_contact;?></td>
                  <td style="background-color: #C8E8FF;"><?php //  echo $row_rem_inqu->service_name;?></td>
                  <td style="background-color: #C8E8FF;"><?php //  echo $row_rem_inqu->adm_username;?></td>
                </tr>
                <?php //  } ?>
              </tbody>
            </table>
          </div>
          <?php //  } ?>
          <?php //  if ( in_array( "6", $md_right ) ) { ?>
          <div class="table-responsive col-md-12 col-lg-12 col-sm-12 col-xs-12">
            <h3 class="text-left" style="font-weight: bold; color: #6E8F74;">Files Reminder <a href="file_view.php" class="btn btn-primary" style="background-color: #6E8F74 !important; border-color: #6E8F74 !important;"> View Files </a></h3>
            <table id="example_three" class="table table-success mb30 table-hover table-bordered display" style="color:#000; background-color: #E0F0E3;" >
              <thead>
                <tr>
                  <th width="25%">File</th>
                  <th width="50%">Notes</th>
                  <th width="10%">Contact</th>
                  <th width="15%">Admin</th>
                  <th  width="15%">Action</th>
                </tr>
              </thead>
              <tbody>
                <?php // 
              // $result_followup=$con->query($query_followup);
              // while($row_followup=$result_followup->fetch_object()) 
              // { ?>
                <tr class="odd gradeX">
                  <td><?php //  echo $row_followup->file_code_no." - ".$row_followup->file_name;?></td>
                  <td><?php //  echo $row_followup->followup_notes;?></td>
                  <td><?php //  echo $row_followup->file_contact;?></td>
                  <td><?php //  echo $row_followup->adm_username;?></td>
                  <td  width="17%"><code> <a  title="Follow Up"style="color:#1C1B17; cursor:pointer; " onClick="return file_followup(<?php //  echo $row_followup->file_id?>);" ><i class="fa fa-comment"></i></a> | <a title="Go To File Details" target="_blank" style="color:green;" href="file_edit.php?file_id=<?php //  echo $row_followup->file_id?>"><i class="fa fa-file"></i></a> <code></td>
                </tr>
                <?php //  } ?>
              </tbody>
            </table>
            <?php //  } ?>
          </div>
        </div>
      </div>
    </div> -->
    <!-- contentpanel --> 
  </div>
  <!-- mainpanel --> 
  <!-- rightpanel --> 
</section>
<script src="js/jquery-1.11.1.min.js"></script> 
<script src="js/jquery-migrate-1.2.1.min.js"></script> 
<script src="js/jquery-ui-1.10.3.min.js"></script> 
<script src="js/bootstrap.min.js"></script> 
<script src="js/modernizr.min.js"></script> 
<script src="js/jquery.sparkline.min.js"></script> 
<script src="js/toggles.min.js"></script> 
<script src="js/retina.min.js"></script> 
<script src="js/jquery.cookies.js"></script> 
<script src="js/flot/jquery.flot.min.js"></script> 
<script src="js/flot/jquery.flot.resize.min.js"></script> 
<script src="js/flot/jquery.flot.spline.min.js"></script> 
<script src="js/morris.min.js"></script> 
<script src="js/raphael-2.1.0.min.js"></script> 
<script src="js/jquery.datatables.min.js"></script> 
<script src="js/select2.min.js"></script> 
<script src="js/custom.js"></script> 
<script>
  jQuery(document).ready(function() {
    "use strict";
    jQuery('#table1').dataTable();
    jQuery('#table2').dataTable({
      "sPaginationType": "full_numbers"
    });
    // Select2
    jQuery('select').select2({
        minimumResultsForSearch: -1
    });
    jQuery('select').removeClass('form-control');
    // Delete row in a table
    jQuery('.delete-row').click(function(){
      var c = confirm("Continue delete?");
      if(c)
        jQuery(this).closest('tr').fadeOut(function(){
          jQuery(this).remove();
        });
        return false;
    });
    // Show aciton upon row hover
    jQuery('.table-hidaction tbody tr').hover(function(){
      jQuery(this).find('.table-action-hide a').animate({opacity: 1});
    },function(){
      jQuery(this).find('.table-action-hide a').animate({opacity: 0});
    });
  });
</script> 
<script src="js/dashboard.js"></script>
</body>
</html>
