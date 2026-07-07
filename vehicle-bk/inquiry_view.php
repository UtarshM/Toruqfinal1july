<?php
include( "ka_include/session.php" );
include( "ka_include/common_function.php" );
include( "ka_include/ka_config.php" );
include( "ka_include/check_admin_login.php" );
// Check Module Rights 
$query_module_detail = "SELECT * FROM admin_login ld where adm_id='" . $_SESSION[ 'adm_id' ] . "' and adm_status=1";
$module_query = $con->query( $query_module_detail );
$row_md_id = $module_query->fetch_array();

$date = new DateTime('now');
//$to_da = $date->format('Y-m-d');

// $date->modify('first day of this month');
// $to_da = $date->format('Y-m-d');

// $date->modify('last day of this month');
// $la_da = $date->format('Y-m-d');


// echo $row_state['md_id']; exit;
$md_right = explode( ",", $row_md_id[ 'md_id' ] );
if ( !in_array( "3", $md_right ) ) {
  header( 'Location: insurance_dashboard.php' );
}
 if($_POST["submit_search"]!=""){
  $strdate = $_REQUEST['strdate'];
  $enddate = $_REQUEST['enddate'];
  $strdate = date("Y-m-d", strtotime($strdate));
  $enddate = date("Y-m-d", strtotime($enddate));
  
     
       
     
   
    if ( $_SESSION[ 'adm_type' ] == 0 ) { // Admin 
      // Check Module Rights
      $query_expe_tot = "SELECT * FROM inquiry_detail td,  status_detail st  where td.inq_status!=3 and td.inq_action IN (1,2,3)  and st.status_id=td.inq_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.inq_id";
      $result_tot = $con->query( $query_expe_tot );
      $total_records = $result_tot->num_rows;

      $query_expe = "SELECT * FROM inquiry_detail td, status_detail st  where td.inq_status!=3 and td.inq_action IN (1,2,3)  and st.status_id=td.inq_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.inq_id";
    } else {
      // Check Module Rights
      $query_expe_tot = "SELECT * FROM inquiry_detail td,  status_detail st  where td.inq_status!=3 and td.inq_action IN (1,2,3)  and st.status_id=td.inq_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.inq_id";
      $result_tot = $con->query( $query_expe_tot );
      $total_records = $result_tot->num_rows;

      $query_expe = "SELECT * FROM inquiry_detail td, status_detail st  where td.inq_status!=3 and td.inq_action IN (1,2,3)  and st.status_id=td.inq_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.inq_id";
    }
  } else {

      

    if ( $_SESSION[ 'adm_type' ] == 0 ) { // Admin 
      // Check Module Rights
      $query_expe_tot = "SELECT * FROM inquiry_detail td,  status_detail st  where td.inq_status!=3 and td.inq_action IN (1,2,3)  and st.status_id=td.inq_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.inq_id";
      $result_tot = $con->query( $query_expe_tot );
      $total_records = $result_tot->num_rows;

      $query_expe = "SELECT * FROM inquiry_detail td, status_detail st  where td.inq_status!=3 and td.inq_action IN (1,2,3)  and st.status_id=td.inq_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.inq_id";
    } else {
      // Check Module Rights
      $query_expe_tot = "SELECT * FROM inquiry_detail td,  status_detail st  where td.inq_status!=3 and td.inq_action IN (1,2,3)  and st.status_id=td.inq_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.inq_id";
      $result_tot = $con->query( $query_expe_tot );
      $total_records = $result_tot->num_rows;

      $query_expe = "SELECT * FROM inquiry_detail td, status_detail st  where td.inq_status!=3 and td.inq_action IN (1,2,3)  and st.status_id=td.inq_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.inq_id";
    }
  }
  if ($_POST["submit_report"] != "") {
    $strdate = $_REQUEST['strdate'];
    $enddate = $_REQUEST['enddate'];
    $strdate = date("Y-m-d", strtotime($strdate));
    $enddate = date("Y-m-d", strtotime($enddate));
    header( 'Location: inquiry_export.php?strdate='.$strdate.'&enddate='.$enddate.'' );
  }
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<meta name="author" content="">
<link rel="shortcut icon" href="img/favicon.png" type="image/png">
<title>Inquiry List   - <?php echo $meta_title; ?></title>
<link href="css/style.default.css" rel="stylesheet">
<link href="css/jquery.datatables.css" rel="stylesheet">
<link href="css/prettyPhoto.css" rel="stylesheet">
<script>
   function deleterec(id)
	{
		if(confirm("Are you sure want to delete?"))
		{
			window.location="inquiry_delete.php?inq_id="+id;
		}
	} 
  function inquiry_followup(inq_id)
	{
		window.open("inquiry_followup.php?inq_id="+inq_id,"","height=700,width=700,left=700,top=200");
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
<?php if (isset($_GET['msg'])) { ?>
<?php if ($_GET['msg'] == "empty") { ?>
<?php if ($_GET['strdate'] != "") {
        $std = $_GET['strdate'];
      } ?>
<?php if ($_GET['enddate'] != "") {
        $edd = $_GET['enddate'];
      } ?>
<script>
        alert("No record found");
      </script>
<?php }
  } ?>
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
      <h2><i class="fa fa-table"></i> Inquiry List </h2>
      <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
        <ol class="breadcrumb">
          <li><a style="color:#1C1B17;" href="insurance_dashboard.php">Dashboard</a></li>
          <li class="active">Inquiry List </li>
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
          <p class="mb20" style="color:green">Inquiry details added successfully.</p>
          <?php } else if($_GET['flag']==2) {?>
          <p class="mb20" style="color:green">Inquiry details updated successfully.</p>
          <?php } else if($_GET['flag']==3) {?>
          <p class="mb20" style="color:green">Inquiry details deleted successfully.</p>
          <?php } else if($_GET['flag']==4) {?>
          <p class="mb20" style="color:green">Inquiry details assign action applied successfully.</p>
          <?php } else if($_GET['flag']==6) {?>
          <p class="mb20" style="color:red">Inquiry details deleted successfully.</p>
          <?php } else if($_GET['flag']==5) {?>
          <p class="mb20" style="color:red">Somthing went wrong.</p>
          <?php } } ?>
          <div class="col-md-12" style="margin:0px 0px 20px 0px;">
            <div class="col-md-8">
              <form class="form-horizontal" method="post" action="">
                <div class="col-md-2"> <span> From Date:&nbsp; </span>
                  <input style="line-height:20px;" class="form-control" required name="strdate" type="date" value="<?php if ($std != "") { $datend2   = new DateTime($std); echo $datend2->format('Y-m-d'); } else if($_REQUEST['strdate']!="") { echo $_REQUEST['strdate'];}   ?>" placeholder="Select Date" />
                </div>
                <div class="col-md-2"> <span>To Date:&nbsp;</span>
                  <input style="line-height:20px;" class="form-control" required name="enddate" type="date" value="<?php if ($edd != "") { $datend3   = new DateTime($edd); echo $datend3->format('Y-m-d'); } else if($_REQUEST['enddate']!="") { echo $_REQUEST['enddate'];}   ?>" placeholder="Select Date" />
                </div>
                 
                <div class="col-md-2"> <span>&nbsp;</span>
                  <input  class="btn btn-primary form-control" type="submit" name="submit_search" value="Search" />
                </div>
                <div class="col-md-3"> <span>&nbsp;</span>
                  <input class="btn btn-primary form-control" type="submit" name="submit_report" value="Download Report" />
                </div>
                
              </form>
            </div>
            
          </div>
          <div class="table-responsive"> 
            
            <!-- Import Excel For MCQ -->
           
              <table id="example" class="table table-success mb30 table-hover table-bordered display" style="color:#000;" >
                <thead bgcolor="#82c21f">
                  <tr>
                     
                     <th width="5%">Id</th>
                     <th width="10%">Date</th>
                     <th width="10%">Name</th>
                    <th width="10%">Contact</th>
                    <th width="30%">Remarks</th>
                      <th width="10%">Status</th>
                    <th  width="10%">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <?php
                if ( $total_records != 0 ) {
                  $i = 0;
                  ?>
                  <?php
                $result = $con->query( $query_expe );
                while ( $row_state = $result->fetch_object() ) {
                  ?>
                  <tr class="odd gradeX">
                  <td><?php echo $row_state->inq_id;?></td>
                   
                     
                    <td > <?php 
                            $datend = new DateTime( $row_state->inq_date );
                          echo $datend->format( 'd-m-Y' );
                           

                  ?>
                      <?php 
                  ?></td>
                     <td><a title="Edit" style="color:green;" href="inquiry_edit.php?inq_id=<?php echo $row_state->inq_id?>"><?php echo $row_state->inq_name;?></a></td>
                    <td><?php echo $row_state->inq_contact;?></td>
                    <td><?php echo $row_state->inq_remarks;?></td>
                      
                    <td style="color: <?php if($row_state->inq_action==1) { ?>#82c21f<?php } elseif($row_state->inq_action==2) { ?>red;<?php } elseif($row_state->inq_action==3) { ?>green;<?php } ?>"><?php if($row_state->inq_action==1) {
                      echo "Pending";
                    } elseif($row_state->inq_action==2) {
                      echo "Rejected - ";
                      $query_rejres_detail = "SELECT * FROM rej_res_detail ld where ld.rej_res_id=".$row_state->rej_res_id;
                      $rejres_query = $con->query( $query_rejres_detail );
                      $row_rejres = $rejres_query->fetch_object();
                      $rejres_name = $row_rejres->rej_res_name;
                      echo $rejres_name;
                    } elseif($row_state->inq_action==3) {
                      echo "Completed";
                    }
                    ?>
                      <?php // echo $row_state->status_name;?></td>
                    <td  width="17%"><code> <a  title="Follow Up"style="color:#1C1B17; cursor:pointer; " onClick="return inquiry_followup(<?php echo $row_state->inq_id?>);" ><i class="fa fa-comment"></i></a> | <a title="Edit" style="color:green;" href="inquiry_edit.php?inq_id=<?php echo $row_state->inq_id?>"><i class="fa fa-pen"></i></a>
                      <?php if($_SESSION['adm_type']==0) { ?>
                      | <a title="Delete" style="color:red;" href="javascript:deleterec(<?php echo $row_state->inq_id?>)"><i class="fa fa-trash"></i></a>
                      <?php } ?>
                      <code></td>
                  </tr>
                  <?php }} ?>
                </tbody>
                <tfoot>
                  <tr>
                 
                     
                    <th width="5%">Id</th>
                    <th width="10%">Date</th>
                     <th width="10%">Name</th>
                    <th width="10%">Contact</th>
                    <th width="30%">Remarks</th>
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
  // Function to handle individual checkbox clicks
  function handleCheckboxClick() {
    var checkboxes = document.getElementsByName('selected_inq_id[]');
    var selectAllCheckbox = document.getElementById('selectAllCheckbox');

    // Check if all checkboxes are checked
    var allChecked = true;
    for (var i = 0; i < checkboxes.length; i++) {
      if (!checkboxes[i].checked) {
        allChecked = false;
        break;
      }
    }

    // Update the state of the "Select All" checkbox
    selectAllCheckbox.checked = allChecked;
  }

  // Function to toggle all checkboxes
  function toggleAll(source) {
    var checkboxes = document.getElementsByName('selected_inq_id[]');
    for (var i = 0; i < checkboxes.length; i++) {
      checkboxes[i].checked = source.checked;
    }
  }
</script> 
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
