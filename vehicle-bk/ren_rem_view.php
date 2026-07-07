<?php
include( "ka_include/session.php" );
include( "ka_include/common_function.php" );
include( "ka_include/ka_config.php" );
include( "ka_include/check_admin_login.php" );
// Check Module Rights 
$query_module_detail = "SELECT * FROM admin_login ld where adm_id='" . $_SESSION[ 'adm_id' ] . "' and adm_status=1";
$module_query = $con->query( $query_module_detail );
$row_md_id = $module_query->fetch_array();

$rem_date = new DateTime('now');
$la_da = $rem_date->format('Y-m-d');

// echo $row_state['md_id']; exit;
$md_right = explode( ",", $row_md_id[ 'md_id' ] );
if ( !in_array( "3", $md_right ) ) {
  header( 'Location: insurance_dashboard.php' );
}
 

    if ( $_SESSION[ 'adm_type' ] == 0 ) { // Admin 
      // Check Module Rights
      $query_rem_tot = "SELECT * FROM renewal_detail td,  status_detail st  where td.ren_status!=3 and td.ren_action IN (1,2) AND ( Date(td.ren_insurance_date) <= '$la_da'  OR Date(td.ren_permit_date) <= '$la_da'  OR Date(td.ren_nat_permit_date) <= '$la_da') and st.status_id=td.ren_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.ren_id";
      $result_tot_rem = $con->query( $query_rem_tot );
      $total_records_rem = $result_tot_rem->num_rows;

      $query_rem = "SELECT * FROM renewal_detail td, status_detail st  where td.ren_status!=3 and td.ren_action IN (1,2) AND ( Date(td.ren_insurance_date) <= '$la_da'  OR Date(td.ren_permit_date) <= '$la_da'  OR Date(td.ren_nat_permit_date) <= '$la_da') and st.status_id=td.ren_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.ren_id";
    } else {
      // Check Module Rights
      $query_rem_tot = "SELECT * FROM renewal_detail td,  status_detail st  where td.ren_status!=3 and td.ren_action IN (1,2) AND ( Date(td.ren_insurance_date) <= '$la_da'  OR Date(td.ren_permit_date) <= '$la_da'  OR Date(td.ren_nat_permit_date) <= '$la_da') and st.status_id=td.ren_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.ren_adm_id=".$_SESSION[ 'adm_id' ]." ORDER BY td.ren_id";
      $result_tot_rem = $con->query( $query_rem_tot );
      $total_records_rem = $result_tot_rem->num_rows;

      $query_rem = "SELECT * FROM renewal_detail td, status_detail st  where td.ren_status!=3 and td.ren_action IN (1,2) AND ( Date(td.ren_insurance_date) <= '$la_da'  OR Date(td.ren_permit_date) <= '$la_da'  OR Date(td.ren_nat_permit_date) <= '$la_da') and st.status_id=td.ren_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.ren_adm_id=".$_SESSION[ 'adm_id' ]." ORDER BY td.ren_id";
    }
// echo $total_records_rem; exit;
  
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<meta name="author" content="">
<link rel="shortcut icon" href="img/favicon.png" type="image/png">
<title>Renewal Reminder  - <?php echo $meta_title; ?></title>
<link href="css/style.default.css" rel="stylesheet">
<link href="css/jquery.datatables.css" rel="stylesheet">
<link href="css/prettyPhoto.css" rel="stylesheet">
<script>
   function deleterec(id)
	{
		if(confirm("Are you sure want to delete?"))
		{
			window.location="renewal_delete.php?ren_id="+id;
		}
	} 
  function renewal_followup(ren_id)
	{
		window.open("renewal_followup.php?ren_id="+ren_id,"","height=700,width=700,left=700,top=200");
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
    var table = $('#example').DataTable(
      {
      "paging":   true,
      "pageLength": 10
    }
    );

     

    
 
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
      <h2><i class="fa fa-table"></i> Renewal Reminder</h2>
      <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
        <ol class="breadcrumb">
          <li><a style="color:#1C1B17;" href="insurance_dashboard.php">Dashboard</a></li>
          <li class="active">Renewal Reminder</li>
        </ol>
      </div>
    </div>
    <div class="contentpanel">
      <div class="panel panel-default">
        <div class="panel-body">
          <?php
          if ( isset( $_GET[ 'flag' ] ) ) {
            ?>
          <?php if($_GET['flag']==1) {?>
          <p class="mb20" style="color:green">Renewal details added successfully.</p>
          <?php } else if($_GET['flag']==2) {?>
          <p class="mb20" style="color:green">Renewal details updated successfully.</p>
          <?php } else if($_GET['flag']==3) {?>
          <p class="mb20" style="color:green">Renewal details deleted successfully.</p>
          <?php } else if($_GET['flag']==4) {?>
          <p class="mb20" style="color:green">Renewal details assign action applied successfully.</p>
          <?php } else if($_GET['flag']==5) {?>
          <p class="mb20" style="color:red">Somthing went wrong.</p>
          <?php } } ?>
          <div class="table-responsive"> 
            
            <!-- Import Excel For MCQ -->
            <form method="post" action="renewal_action_porcess.php">
              <?php if ( $_SESSION[ 'adm_type' ] == 0 ) { // Admin  ?>
              <div class="form-group col-sm-12 col-md-12 col-lg-12" style="margin-top: 25px;">
                <select name="ren_adm_id" required class="form-control" style="width: 250px;">
                  <option value="">Select Staff</option>
                  <?php
                  $query_admin = "SELECT * FROM admin_login WHERE adm_status=1 and adm_id!=1 and branch_id=".$_SESSION[ 'adm_branch' ]."";
                  $result_admin = $con->query( $query_admin );
                  while ( $row_admin = $result_admin->fetch_object() ) {
                    ?>
                  <option value="<?php echo $row_admin->adm_id?>"> <?php echo $row_admin->adm_username?> </option>
                  <?php } ?>
                  <!-- Add more actions as needed -->
                </select>
                <button type="submit" class="btn">Submit</button>
              </div>
              <?php } ?>
              <table id="example" class="table table-success mb30 table-hover table-bordered display" style="color:#000;" >
                <thead bgcolor="#82c21f">
                  <tr>
                    <?php if ( $_SESSION[ 'adm_type' ] == 0 ) { // Admin  ?>
                    <th width="5%">Select</th>
                    <?php } ?>
                    <th width="5%">Series</th>
                    <th width="10%">Insurance  Date</th>
                    <th width="10%">Permit  Date</th>
                    <th width="10%">National Permit Date</th>
                    <th width="10%">Register No.</th>
                    <th width="10%">Name</th>
                    <th width="10%">Contact</th>
                    <th width="10%">Model</th>
                    <th width="10%">Assign</th>
                    <th width="10%">Status</th>
                    <th  width="10%">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <?php
                if ( $total_records_rem != 0 ) {
                  $i = 0;
                  ?>
                  <?php
                $result = $con->query( $query_rem );
                while ( $row_state = $result->fetch_object() ) {
                  ?>
                  <tr class="odd gradeX">
                    <?php if ( $_SESSION[ 'adm_type' ] == 0 ) { // Admin  ?>
                    <td><input type="checkbox" name="selected_ren_id[]" value="<?php echo $row_state->ren_id; ?>"></td>
                    <?php } ?>
                    <td ><?php echo $row_state->ren_series;?></td>
                    <?php 
                    $rem_datend = new DateTime( $row_state->ren_insurance_date );
                    // echo $rem_datend->format( 'd-m-Y' );
                    if ($rem_datend > $rem_date) {
                      echo '<td style="color: green;">' . $rem_datend->format('d-m-Y') . '</td>';
                      } else {
                          echo '<td style="color: red;">' . $rem_datend->format('d-m-Y') . '</td>';
                      }
                    ?>
                    <?php 
                    $rem_datend = new DateTime( $row_state->ren_permit_date );
                    // echo $rem_datend->format( 'd-m-Y' );
                    if ($rem_datend > $rem_date) {
                      echo '<td style="color: green;">' . $rem_datend->format('d-m-Y') . '</td>';
                      } else {
                          echo '<td style="color: red;">' . $rem_datend->format('d-m-Y') . '</td>';
                      }
                    ?>
                    <?php 
                    $rem_datend = new DateTime( $row_state->ren_nat_permit_date );
                    // echo $rem_datend->format( 'd-m-Y' );
                    if ($rem_datend > $rem_date) {
                      echo '<td style="color: green;">' . $rem_datend->format('d-m-Y') . '</td>';
                      } else {
                          echo '<td style="color: red;">' . $rem_datend->format('d-m-Y') . '</td>';
                      }
                    ?>
                     
                    <td><?php echo $row_state->ren_reg_no;?></td>
                    <td><a title="Edit" style="color:green;" href="renewal_edit.php?ren_id=<?php echo $row_state->ren_id?>"><?php echo $row_state->ren_name;?></a></td>
                    <td><?php echo $row_state->ren_contact;?></td>
                    <td><?php echo $row_state->ren_vmodel;?></td>
                    <td><?php
                  if($row_state->ren_adm_id!=0) {
                    $query_asign_detail = "SELECT * FROM admin_login ld where ld.adm_id=".$row_state->ren_adm_id;
                    $asign_query = $con->query( $query_asign_detail );
                    $row_asign = $asign_query->fetch_object();
                    $asign_name = $row_asign->adm_username;
                    echo $asign_name;

                  } ?></td>
                    <td style="color: <?php if($row_state->ren_action==1) { ?>green<?php } elseif($row_state->ren_action==2) { ?>red;<?php } ?>"><?php if($row_state->ren_action==1) {
                      echo "Confirmed";
                    } elseif($row_state->ren_action==2) {
                      echo "Rejected - ";
                      $query_rejres_detail = "SELECT * FROM rej_res_detail ld where ld.rej_res_id=".$row_state->rej_res_id;
                      $rejres_query = $con->query( $query_rejres_detail );
                      $row_rejres = $rejres_query->fetch_object();
                      $rejres_name = $row_rejres->rej_res_name;
                      echo $rejres_name;
                    } elseif($row_state->ren_action==3) {
                      echo "Completed";
                    }
                    ?></td>
                    <td  width="17%"><code> <a  title="Follow Up"style="color:#1C1B17; cursor:pointer; " onClick="return renewal_followup(<?php echo $row_state->ren_id?>);" ><i class="fa fa-comment"></i></a> | <a target="_blank" style="color:#333;" title="Documents" href="renewal_documents.php?ren_id=<?php echo $row_state->ren_id?>"><i class="fa fa-image"></i></a> | <a title="Edit" style="color:green;" href="renewal_edit.php?ren_id=<?php echo $row_state->ren_id?>"><i class="fa fa-pen"></i></a>
                      <?php if($_SESSION['adm_type']==0) { ?>
                      | <a title="Delete" style="color:red;" href="javascript:deleterec(<?php echo $row_state->ren_id?>)"><i class="fa fa-trash"></i></a>
                      <?php } ?>
                      <code></td>
                  </tr>
                  <?php }} ?>
                </tbody>
                <tfoot>
                  <tr>
                    <?php if ( $_SESSION[ 'adm_type' ] == 0 ) { // Admin  ?>
                    <th width="5%" width="8%">
                    Select
                    </th>
                    <?php } ?>
                    <th width="5%" width="8%">Series</th>
                    <th width="10%">Insurance  Date</th>
                    <th width="10%">Permit  Date</th>
                    <th width="10%">National Permit Date</th>
                    <th width="10%">Register No.</th>
                    <th width="10%">Name</th>
                    <th width="10%">Contact</th>
                    <th width="10%">Model</th>
                    <th width="10%">Assign</th>
                    <th width="10%">Status</th>
                    <th  width="10%">Action</th>
                  </tr>
                </tfoot>
              </table>
            </form>
          </div>
          <!-- table-responsive --> 
        </div>
        <!-- panel-body --> 
      </div>
      <!-- panel --> 
    </div>
    <!-- contentpanel --> 
  </div>
  <!-- mainpanel --> 
</section>
<!--<script src="js/jquery-1.11.1.min.js"></script>--> 
<script src="js/jquery-migrate-1.2.1.min.js"></script> 
<script src="js/bootstrap.min.js"></script> 
<script src="js/modernizr.min.js"></script> 
<script src="js/jquery.sparkline.min.js"></script> 
<script src="js/toggles.min.js"></script> 
<script src="js/retina.min.js"></script> 
<script src="js/jquery.cookies.js"></script> 
<script src="js/jquery.prettyPhoto.js"></script> 
<script src="js/jquery.datatables.min.js"></script> 
<script src="js/select2.min.js"></script> 
<script src="js/custom.js"></script> 
<script>
  jQuery(document).ready(function(){
    
    "use strict";
    
    jQuery('.thmb').hover(function(){
      var t = jQuery(this);
      t.find('.ckbox').show();
      t.find('.fm-group').show();
    }, function() {
      var t = jQuery(this);
      if(!t.closest('.thmb').hasClass('checked')) {
        t.find('.ckbox').hide();
        t.find('.fm-group').hide();
      }
    });
    
    jQuery('.ckbox').each(function(){
      var t = jQuery(this);
      var parent = t.parent();
      if(t.find('input').is(':checked')) {
        t.show();
        parent.find('.fm-group').show();
        parent.addClass('checked');
      }
    });
    
    
    jQuery('.ckbox').click(function(){
      var t = jQuery(this);
      if(!t.find('input').is(':checked')) {
        t.closest('.thmb').removeClass('checked');
        enable_itemopt(false);
      } else {
        t.closest('.thmb').addClass('checked');
        enable_itemopt(true);
      }
    });
    
    jQuery('#selectall').click(function(){
      if(jQuery(this).is(':checked')) {
        jQuery('.thmb').each(function(){
          jQuery(this).find('input').attr('checked',true);
          jQuery(this).addClass('checked');
          jQuery(this).find('.ckbox, .fm-group').show();
        });
        enable_itemopt(true);
      } else {
        jQuery('.thmb').each(function(){
          jQuery(this).find('input').attr('checked',false);
          jQuery(this).removeClass('checked');
          jQuery(this).find('.ckbox, .fm-group').hide();
        });
        enable_itemopt(false);
      }
    });
    
    function enable_itemopt(enable) {
      if(enable) {
        jQuery('.itemopt').removeClass('disabled');
      } else {
        
        // check all thumbs if no remaining checks
        // before we can disabled the options
        var ch = false;
        jQuery('.thmb').each(function(){
          if(jQuery(this).hasClass('checked'))
            ch = true;
        });
        
        if(!ch)
          jQuery('.itemopt').addClass('disabled');
      }
    }
    
    jQuery("a[data-rel^='prettyPhoto']").prettyPhoto();
    
  });
  
</script> 
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
</body>
</html>
