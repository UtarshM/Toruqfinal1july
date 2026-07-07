<?php
include( "ka_include/session.php" );
include( "ka_include/common_function.php" );
include( "ka_include/ka_config.php" );
include( "ka_include/check_admin_login.php" );
// Check Module Rights 
$query_module_detail = "SELECT * FROM admin_login ld where adm_id='" . $_SESSION[ 'adm_id' ] . "' and adm_status=1";
$module_query = $con->query( $query_module_detail );
$row_md_id = $module_query->fetch_array();
// echo $row_rtsk['md_id']; exit;
$md_right = explode( ",", $row_md_id[ 'md_id' ] );
if ( !in_array( "6", $md_right ) ) {
  header( 'Location: rto_dashboard.php' );
}
$rto_id = $_GET['rto_id'];

$query_rto_detail = "SELECT * FROM rto_detail ld where ld.rto_id=" . $rto_id." and rto_status!='3' ";
$result_rto = $con->query( $query_rto_detail );
$row_rto = $result_rto->fetch_object();

// Check Module Rights
$query_rtsk = "SELECT * FROM rto_task_detail td, status_detail st, service_detail sd, rto_task_action_detail ra  where td.rto_id=".$rto_id." and sd.service_id=td.service_id and ra.rtsk_action_id=td.rtsk_action_id and td.rtsk_status!=3 and st.status_id=td.rtsk_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.rtsk_id";
$result_rtsk = $con->query( $query_rtsk );
$rtsk_total = $result_rtsk->num_rows;
// echo $rtsk_total; exit;
// echo $final_tot_amount." - ".$final_crdt_amount." = ".$final_dbt_amount; // exit;
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<meta name="author" content="">
<link rel="shortcut icon" href="img/favicon.png" type="image/png">
<title>Vahan Tasks - <?php echo $row_rto->rto_name." - ".$row_rto->rto_contact; ?>  - <?php echo $meta_title; ?></title>
<link href="css/style.default.css" rel="stylesheet">
<link href="css/jquery.datatables.css" rel="stylesheet">
<link href="css/prettyPhoto.css" rel="stylesheet">
<script>
   function deleterec(id,rto_id)
	{
		if(confirm("Are you sure want to delete?"))
		{
			window.location="vahan_task_delete.php?rtsk_id="+id+"&rto_id="+rto_id;
		}
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
      <h2><i class="fa fa-table"></i> Vahan Tasks [<?php echo $row_rto->rto_name." - ".$row_rto->rto_contact; ?>] </h2>
      <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
        <ol class="breadcrumb">
          <li><a style="color:#1C1B17;" href="rto_dashboard.php">Dashboard</a></li>
          <li><a style="color:#1C1B17;" href="vahan_view.php"> Vahan Work List </a></li>
          <li class="active">Vahan Tasks [<?php echo $row_rto->rto_name." - ".$row_rto->rto_contact; ?>] </li>
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
          <p class="mb20" style="color:green">Vahan Tasks details added successfully.</p>
          <?php } else if($_GET['flag']==2) {?>
          <p class="mb20" style="color:green">Vahan Tasks details updated successfully.</p>
          <?php } else if($_GET['flag']==3) {?>
          <p class="mb20" style="color:green">Vahan Tasks details deleted successfully.</p>
          <?php } else if($_GET['flag']==4) {?>
          <p class="mb20" style="color:green">Vahan Tasks details assign action applied successfully.</p>
          <?php } else if($_GET['flag']==5) {?>
          <p class="mb20" style="color:red">Somthing went wrong.</p>
          <?php } } ?>
          <div class="table-responsive">
            <table id="example" class="table table-success mb30 table-hover table-bordered display" style="color:#000;" >
              <thead bgcolor="#82c21f">
                <tr>
                   <th width="5%">ID</th>
                   <th width="15%">Service</th> 
                   <th width="50%">Notes</th> 
                  <th width="15%">Status</th>
                  <th  width="10%">Action</th>
                </tr>
              </thead>
              <tbody>
                <?php
                if ( $rtsk_total != 0 ) {
                  $i = 0;
                  ?>
                <?php
                $result = $con->query( $query_rtsk );
                while ( $row_rtsk = $result->fetch_object() ) {
                  ?>
                <tr class="odd gradeX">
                   <td ><?php echo $row_rtsk->rtsk_id;?></td>
                  <td><a title="Edit" style="color:green;" href="vahan_task_edit.php?rtsk_id=<?php echo $row_rtsk->rtsk_id?>&rto_id=<?php echo $rto_id?>"><?php echo $row_rtsk->service_name;?></a></td>
                  <td><?php echo $row_rtsk->rtsk_notes;?></td>
                  <td><?php echo $row_rtsk->rtsk_action_name;?></td>
                   <td  width="17%"><code> <a title="Edit" style="color:green;" href="vahan_task_edit.php?rtsk_id=<?php echo $row_rtsk->rtsk_id?>&rto_id=<?php echo $rto_id?>"><i class="fa fa-pen"></i></a> <?php if($_SESSION['adm_type']==0) { ?>| <a title="Delete" style="color:red;" href="javascript:deleterec(<?php echo $row_rtsk->rtsk_id?>,<?php echo $rto_id?>)"><i class="fa fa-trash"></i></a><?php } ?> <code></td>
                </tr>
                <?php } } ?>
              </tbody>
              <tfoot>
                <tr>
                   <th width="5%" width="8%">ID</th>
                  <th width="15%">Service</th> 
                  <th width="50%">Notes</th> 
                  <th width="15%">Status</th>
                  <th  width="10%">Action</th>
                </tr>
              </tfoot>
            </table>
            <!-- </form> -->

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
