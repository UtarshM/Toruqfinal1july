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
if ( !in_array( "5", $md_right ) ) {
  header( 'Location: rto_dashboard.php' );
}
// Check Module Rights

if ( $_SESSION[ 'adm_type' ] == 0 ) { // Admin 

$query_expe_tot = "SELECT * FROM rto_detail td,  status_detail st  where td.rot_status !=3 and st.status_id=td.rot_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.rot_id";
$result_tot = $con->query( $query_expe_tot );
$total_records = $result_tot->num_rows;
// echo $query_expe_tot; exit;

$query_expe = "SELECT * FROM rto_detail td, status_detail st  where td.rot_status !=3 and st.status_id=td.rot_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.rot_id";

} else {
  $query_expe_tot = "SELECT * FROM rto_detail td,  status_detail st  where td.rot_status !=3 and st.status_id=td.rot_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.rot_adm_id=".$_SESSION[ 'adm_id' ]." ORDER BY td.rot_id";
  $result_tot = $con->query( $query_expe_tot );
  $total_records = $result_tot->num_rows;
  // echo $query_expe_tot; exit;

  $query_expe = "SELECT * FROM rto_detail td, status_detail st  where td.rot_status !=3 and st.status_id=td.rot_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.rot_adm_id=".$_SESSION[ 'adm_id' ]." ORDER BY td.rot_id";
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<meta name="author" content="">
<link rel="shortcut icon" href="img/favicon.png" type="image/png">
<title>RTO Task List   - <?php echo $meta_title; ?></title>
<link href="css/style.default.css" rel="stylesheet">
<link href="css/jquery.datatables.css" rel="stylesheet">
<link href="css/prettyPhoto.css" rel="stylesheet">
<script>
   function deleterec(id)
	{
		if(confirm("Are you sure want to delete?"))
		{
			window.location="rto_delete.php?rot_id="+id;
		}
	} 
  function rto_followup(rot_id)
	{
		window.open("rto_followup.php?rot_id="+rot_id,"","height=700,width=700,left=700,top=200");
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
      <h2><i class="fa fa-table"></i> RTO Task List </h2>
      <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
        <ol class="breadcrumb">
          <li><a style="color:#1C1B17;" href="rto_dashboard.php">Dashboard</a></li>
          <li class="active">RTO Task List </li>
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
          <p class="mb20" style="color:green">RTO Task details added successfully.</p>
          <?php } else if($_GET['flag']==2) {?>
          <p class="mb20" style="color:green">RTO Task details updated successfully.</p>
          <?php } else if($_GET['flag']==3) {?>
          <p class="mb20" style="color:green">RTO Task details deleted successfully.</p>
          <?php } else if($_GET['flag']==4) {?>
          <p class="mb20" style="color:green">RTO Task details assign action applied successfully.</p>
          <?php } else if($_GET['flag']==5) {?>
          <p class="mb20" style="color:red">Somthing went wrong.</p>
          <?php } } ?>
          <div class="table-responsive">
          <?php if ( $_SESSION[ 'adm_type' ] == 0 ) { // Admin  ?>
          <!-- Import Excel For MCQ -->
      <form method="POST" action="rto_excelUpload.php" enctype="multipart/form-data">
    <div class="form-group col-sm-4">
      <h5>Upload RTO Task Data by excel file <span class="asterisk">*</span></h5>
      <input type="file" name="file" required class="form-control">
     </div>
    <div class="form-group col-sm-3">
      <h5><a href="img/RTO-Sample.xls">Download sample xls file</a></h5> 
      <button type="submit" name="submit_rto_excel"  class="btn">Upload Excel</button>
    </div>
     
  </form>
  <?php } ?>
<!-- Import Excel For MCQ -->

<form method="post" action="rto_action_porcess.php">
<?php if ( $_SESSION[ 'adm_type' ] == 0 ) { // Admin  ?>
          <div class="form-group col-sm-12 col-md-12 col-lg-12" style="margin-top: 25px;">
          <select name="rot_adm_id" required class="form-control" style="width: 250px;">
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
                <?php if ( $_SESSION[ 'adm_type' ] == 0 ) { // Admin  ?><th width="5%">Select</th><?php } ?>
                  <th width="5%">ID</th>
                   <th width="10%">Date</th> 
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
                if ( $total_records != 0 ) {
                  $i = 0;
                  ?>
                <?php
                $result = $con->query( $query_expe );
                while ( $row_state = $result->fetch_object() ) {
                  ?>
                <tr class="odd gradeX">
                <?php if ( $_SESSION[ 'adm_type' ] == 0 ) { // Admin  ?> <td><input type="checkbox" name="selected_rot_id[]" value="<?php echo $row_state->rot_id; ?>"></td><?php } ?>

                  <td ><?php echo $row_state->rot_id;?></td>
                   <td ><?php $datend = new DateTime( $row_state->rot_date );
                          echo $datend->format( 'd-m-Y' );
                  ?></td>
                  <td><?php echo $row_state->rot_reg_no;?></td>
                  <td><a title="Edit" style="color:green;" href="rto_edit.php?rot_id=<?php echo $row_state->rot_id?>"><?php echo $row_state->rot_name;?></a></td>
                  <td><?php echo $row_state->rot_contact;?></td>
                   <td><?php echo $row_state->rot_vmodel;?></td>
                   <td><?php
                  if($row_state->rot_adm_id!=0) {
                    $query_asign_detail = "SELECT * FROM admin_login ld where ld.adm_id=".$row_state->rot_adm_id;
                    $asign_query = $con->query( $query_asign_detail );
                    $row_asign = $asign_query->fetch_object();
                    $asign_name = $row_asign->adm_username;
                    echo $asign_name;
                  } ?></td>
                  <td><?php echo $row_state->status_name;?></td>
                  <td  width="17%"><code> <a  title="Follow Up"style="color:#1C1B17; cursor:pointer; " onClick="return rto_followup(<?php echo $row_state->rot_id?>);" ><i class="fa fa-comment"></i></a> | <a target="_blank" style="color:#333;" title="Documents" href="rto_documents.php?rot_id=<?php echo $row_state->rot_id?>"><i class="fa fa-image"></i></a> | <a title="Edit" style="color:green;" href="rto_edit.php?rot_id=<?php echo $row_state->rot_id?>"><i class="fa fa-pen"></i></a> <?php if($_SESSION['adm_type']==0) { ?>| <a title="Delete" style="color:red;" href="javascript:deleterec(<?php echo $row_state->rot_id?>)"><i class="fa fa-trash"></i></a><?php } ?> <code></td>
                </tr>
                <?php }} ?>
              </tbody>
              <tfoot>
                <tr>
                <?php if ( $_SESSION[ 'adm_type' ] == 0 ) { // Admin  ?><th width="5%" width="8%">Select</th><?php } ?>
                  <th width="5%" width="8%">ID</th>
                  <th width="10%">Date</th> 
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
