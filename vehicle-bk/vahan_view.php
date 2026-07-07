<?php
include( "ka_include/session.php" );
include( "ka_include/common_function.php" );
include( "ka_include/ka_config.php" );
include( "ka_include/check_admin_login.php" );
// Check Module Rights 
$query_module_detail = "SELECT * FROM admin_login ld where adm_id='" . $_SESSION[ 'adm_id' ] . "' and adm_status=1";
$module_query = $con->query( $query_module_detail );
$row_md_id = $module_query->fetch_array();

// $date = new DateTime('now');
// //$to_da = $date->format('Y-m-d');

// $date->modify('first day of this month');
// $to_da = $date->format('Y-m-d');

// $date->modify('last day of this month');
// $la_da = $date->format('Y-m-d');

// and Date(td.rto_date) >= '$to_da' and Date(td.rto_date) <= '$la_da'
// and Date(td.rto_date) >= '$to_da' and Date(td.rto_date) <= '$la_da'
// and Date(td.rto_date) >= '$to_da' and Date(td.rto_date) <= '$la_da'
// and Date(td.rto_date) >= '$to_da' and Date(td.rto_date) <= '$la_da'
// and Date(td.rto_date) >= '$to_da' and Date(td.rto_date) <= '$la_da'
// and Date(td.rto_date) >= '$to_da' and Date(td.rto_date) <= '$la_da'
// and Date(td.rto_date) >= '$to_da' and Date(td.rto_date) <= '$la_da'
// and Date(td.rto_date) >= '$to_da' and Date(td.rto_date) <= '$la_da'
// and Date(td.rto_date) >= '$to_da' and Date(td.rto_date) <= '$la_da'
// and Date(td.rto_date) >= '$to_da' and Date(td.rto_date) <= '$la_da'


// echo $row_state['md_id']; exit;
$md_right = explode( ",", $row_md_id[ 'md_id' ] );
if ( !in_array( "7", $md_right ) ) {
  header( 'Location: rto_dashboard.php' );
}
 
if($_POST["submit_search"]!=""){
  $strdate = $_POST['strdate'];
  $enddate = $_POST['enddate'];
  $strdate = date("Y-m-d", strtotime($strdate));
  $enddate = date("Y-m-d", strtotime($enddate));
   
  
     
  
    if ( $_SESSION[ 'adm_type' ] == 0 ) { // Admin 
      // Check Module Rights
      $query_expe_tot = "SELECT * FROM rto_detail td,  status_detail st  where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2) and Date(td.rto_date) >= '$strdate' and Date(td.rto_date) <= '$enddate' and st.status_id=td.rto_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.rto_id";
      $result_tot = $con->query( $query_expe_tot );
      $total_records = $result_tot->num_rows;

      $query_expe = "SELECT * FROM rto_detail td, status_detail st  where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2) and Date(td.rto_date) >= '$strdate' and Date(td.rto_date) <= '$enddate' and st.status_id=td.rto_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.rto_id";
      
      $query_tot_amount = "SELECT SUM(td.rto_amount) as tot_amount FROM rto_detail td where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2) and Date(td.rto_date) >= '$strdate' and Date(td.rto_date) <= '$enddate' and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.rto_id";
      $result_tot_amount = $con->query( $query_tot_amount );
      $row_tot_amount = $result_tot_amount->fetch_object();
      $final_tot_amount = $row_tot_amount->tot_amount;
      
      $query_crdt_amount = "SELECT SUM(td.rto_credit) as crdt_amount FROM rto_detail td where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2) and Date(td.rto_date) >= '$strdate' and Date(td.rto_date) <= '$enddate' and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.rto_id";
      $result_crdt_amount = $con->query( $query_crdt_amount );
      $row_crdt_amount = $result_crdt_amount->fetch_object();
      $final_crdt_amount = $row_crdt_amount->crdt_amount;
      
      $query_dbt_amount = "SELECT SUM(td.rto_debit) as dbt_amount FROM rto_detail td where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2) and Date(td.rto_date) >= '$strdate' and Date(td.rto_date) <= '$enddate' and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.rto_id";
      $result_dbt_amount = $con->query( $query_dbt_amount );
      $row_dbt_amount = $result_dbt_amount->fetch_object();
      $final_dbt_amount = $row_dbt_amount->dbt_amount;

    } else {
      // Check Module Rights
      $query_expe_tot = "SELECT * FROM rto_detail td,  status_detail st  where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2) and Date(td.rto_date) >= '$strdate' and Date(td.rto_date) <= '$enddate' and st.status_id=td.rto_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.rto_adm_id=".$_SESSION[ 'adm_id' ]." ORDER BY td.rto_id";
      $result_tot = $con->query( $query_expe_tot );
      $total_records = $result_tot->num_rows;

      $query_expe = "SELECT * FROM rto_detail td, status_detail st  where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2) and Date(td.rto_date) >= '$strdate' and Date(td.rto_date) <= '$enddate' and st.status_id=td.rto_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.rto_adm_id=".$_SESSION[ 'adm_id' ]." ORDER BY td.rto_id";

      $query_tot_amount = "SELECT SUM(td.rto_amount) as tot_amount FROM rto_detail td where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2) and Date(td.rto_date) >= '$strdate' and Date(td.rto_date) <= '$enddate' and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.rto_adm_id=".$_SESSION[ 'adm_id' ]." ORDER BY td.rto_id";
      $result_tot_amount = $con->query( $query_tot_amount );
      $row_tot_amount = $result_tot_amount->fetch_object();
      $final_tot_amount = $row_tot_amount->tot_amount;
      
      $query_crdt_amount = "SELECT SUM(td.rto_credit) as crdt_amount FROM rto_detail td where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2) and Date(td.rto_date) >= '$strdate' and Date(td.rto_date) <= '$enddate' and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.rto_adm_id=".$_SESSION[ 'adm_id' ]." ORDER BY td.rto_id";
      $result_crdt_amount = $con->query( $query_crdt_amount );
      $row_crdt_amount = $result_crdt_amount->fetch_object();
      $final_crdt_amount = $row_crdt_amount->crdt_amount;
      
      $query_dbt_amount = "SELECT SUM(td.rto_debit) as dbt_amount FROM rto_detail td where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2) and Date(td.rto_date) >= '$strdate' and Date(td.rto_date) <= '$enddate' and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.rto_adm_id=".$_SESSION[ 'adm_id' ]." ORDER BY td.rto_id";
      $result_dbt_amount = $con->query( $query_dbt_amount );
      $row_dbt_amount = $result_dbt_amount->fetch_object();
      $final_dbt_amount = $row_dbt_amount->dbt_amount;

    }
  } else {

    if ( $_SESSION[ 'adm_type' ] == 0 ) { // Admin 
      // Check Module Rights
      $query_expe_tot = "SELECT * FROM rto_detail td,  status_detail st  where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2)  and st.status_id=td.rto_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.rto_id";
      $result_tot = $con->query( $query_expe_tot );
      $total_records = $result_tot->num_rows;

      $query_expe = "SELECT * FROM rto_detail td, status_detail st  where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2)  and st.status_id=td.rto_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.rto_id";

      $query_tot_amount = "SELECT SUM(td.rto_amount) as tot_amount FROM rto_detail td where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2)  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.rto_id";
      $result_tot_amount = $con->query( $query_tot_amount );
      $row_tot_amount = $result_tot_amount->fetch_object();
      $final_tot_amount = $row_tot_amount->tot_amount;
      
      $query_crdt_amount = "SELECT SUM(td.rto_credit) as crdt_amount FROM rto_detail td where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2)  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.rto_id";
      $result_crdt_amount = $con->query( $query_crdt_amount );
      $row_crdt_amount = $result_crdt_amount->fetch_object();
      $final_crdt_amount = $row_crdt_amount->crdt_amount;
      
      $query_dbt_amount = "SELECT SUM(td.rto_debit) as dbt_amount FROM rto_detail td where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2)  and td.branch_id=".$_SESSION[ 'adm_branch' ]." ORDER BY td.rto_id";
      $result_dbt_amount = $con->query( $query_dbt_amount );
      $row_dbt_amount = $result_dbt_amount->fetch_object();
      $final_dbt_amount = $row_dbt_amount->dbt_amount;

    } else {
      // Check Module Rights
      $query_expe_tot = "SELECT * FROM rto_detail td,  status_detail st  where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2)  and st.status_id=td.rto_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.rto_adm_id=".$_SESSION[ 'adm_id' ]." ORDER BY td.rto_id";
      $result_tot = $con->query( $query_expe_tot );
      $total_records = $result_tot->num_rows;

      $query_expe = "SELECT * FROM rto_detail td, status_detail st  where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2)  and st.status_id=td.rto_status  and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.rto_adm_id=".$_SESSION[ 'adm_id' ]." ORDER BY td.rto_id";

      $query_tot_amount = "SELECT SUM(td.rto_amount) as tot_amount FROM rto_detail td where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2)  and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.rto_adm_id=".$_SESSION[ 'adm_id' ]." ORDER BY td.rto_id";
      $result_tot_amount = $con->query( $query_tot_amount );
      $row_tot_amount = $result_tot_amount->fetch_object();
      $final_tot_amount = $row_tot_amount->tot_amount;
      
      $query_crdt_amount = "SELECT SUM(td.rto_credit) as crdt_amount FROM rto_detail td where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2)  and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.rto_adm_id=".$_SESSION[ 'adm_id' ]." ORDER BY td.rto_id";
      $result_crdt_amount = $con->query( $query_crdt_amount );
      $row_crdt_amount = $result_crdt_amount->fetch_object();
      $final_crdt_amount = $row_crdt_amount->crdt_amount;
      
      $query_dbt_amount = "SELECT SUM(td.rto_debit) as dbt_amount FROM rto_detail td where td.service_id=2 and td.rto_status!=3 and td.rto_action IN (1,2)  and td.branch_id=".$_SESSION[ 'adm_branch' ]." and td.rto_adm_id=".$_SESSION[ 'adm_id' ]." ORDER BY td.rto_id";
      $result_dbt_amount = $con->query( $query_dbt_amount );
      $row_dbt_amount = $result_dbt_amount->fetch_object();
      $final_dbt_amount = $row_dbt_amount->dbt_amount;

    }
  }
  // echo $final_tot_amount." - ".$final_crdt_amount." = ".$final_dbt_amount; exit;

  if ($_POST["submit_report"] != "") {
    $strdate = $_POST['strdate'];
    $enddate = $_POST['enddate'];
     $strdate = date("Y-m-d", strtotime($strdate));
    $enddate = date("Y-m-d", strtotime($enddate));
    header( 'Location: vahan_export.php?strdate=' . $strdate . '&enddate=' . $enddate.'' );
  }
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
<meta name="author" content="">
<link rel="shortcut icon" href="img/favicon.png" type="image/png">
<title>Vahan Work List   - <?php echo $meta_title; ?></title>
<link href="css/style.default.css" rel="stylesheet">
<link href="css/jquery.datatables.css" rel="stylesheet">
<link href="css/prettyPhoto.css" rel="stylesheet">
<script>
   function deleterec(id)
	{
		if(confirm("Are you sure want to delete?"))
		{
			window.location="vahan_delete.php?rto_id="+id;
		}
	} 
  // function vahan_followup(rto_id)
	// {
	// 	window.open("vahan_followup.php?rto_id="+rto_id,"","height=700,width=700,left=700,top=200");
	// }
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
      <h2><i class="fa fa-table"></i> Vahan Work List </h2>
      <div class="breadcrumb-wrapper"> <span class="label">You are here:</span>
        <ol class="breadcrumb">
          <li><a style="color:#1C1B17;" href="rto_dashboard.php">Dashboard</a></li>
          <li class="active">Vahan Work List </li>
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
          <p class="mb20" style="color:green">Vahan Work details added successfully.</p>
          <?php } else if($_GET['flag']==2) {?>
          <p class="mb20" style="color:green">Vahan Work details updated successfully.</p>
          <?php } else if($_GET['flag']==3) {?>
          <p class="mb20" style="color:green">Vahan Work details deleted successfully.</p>
          <?php } else if($_GET['flag']==4) {?>
          <p class="mb20" style="color:green">Vahan Work details assign action applied successfully.</p>
          <?php } else if($_GET['flag']==5) {?>
          <p class="mb20" style="color:red">Somthing went wrong.</p>
          <?php } } ?>
          <div class="col-md-12" style="margin:0px 0px 20px 0px;">
            <div class="col-md-12">
              <form class="form-horizontal" method="post" action="">
                <div class="col-md-3"> <span> From Date:&nbsp;  </span>
                  <input style="line-height:20px;" class="form-control" required name="strdate" type="date" value="<?php if ($std != "") { $datend2   = new DateTime($std); echo $datend2->format('Y-m-d'); } else if($_POST['strdate']!="") { echo $_POST['strdate'];}  ?>" placeholder="Select Date" />
                </div>
                <div class="col-md-3"> <span>To Date:&nbsp;</span>
                  <input style="line-height:20px;" class="form-control" required name="enddate" type="date" value="<?php if ($edd != "") { $datend3   = new DateTime($edd); echo $datend3->format('Y-m-d'); } else if($_POST['enddate']!="") { echo $_POST['enddate'];}  ?>" placeholder="Select Date" />
                </div>
                <div class="col-md-3"> <span>&nbsp;</span>
                <input  class="btn btn-primary form-control" type="submit" name="submit_search" value="Search" /> 
                </div>
                <div class="col-md-3"> <span>&nbsp;</span>
                  <input class="btn btn-primary form-control" type="submit" name="submit_report" value="Download Date Wise Report" />
                </div>
              </form>
            </div>
            <div class="col-md-12" style="margin-top: 25px !important;">
            <h4 class="text-center"> 
            <span style="color: blue;">Total Amount : <b><?php echo "&#8377;".number_format($final_tot_amount,2); ?></b></span> - <span style="color: green;">Credit [Jama] : <b><?php echo "&#8377;".number_format($final_crdt_amount,2); ?></b></span> = <span style="color: red;">Debit [Baki] : <b><?php echo "&#8377;".number_format($final_dbt_amount,2); ?></b></span> 
          </h4>
          </div>

            


          </div>

          <div class="table-responsive">
            
<!-- Import Excel For MCQ -->
<!-- <form method="post" action="vahan_action_porcess.php"> -->
<!-- <?php // if ( $_SESSION[ 'adm_type' ] == 0 ) { // Admin  ?>
          <div class="form-group col-sm-12 col-md-12 col-lg-12" style="margin-top: 25px;">
          <select name="rto_adm_id" required class="form-control" style="width: 250px;">
            <option value="">Select Staff</option>

            <?php
                  // $query_admin = "SELECT * FROM admin_login WHERE adm_status=1 and adm_id!=1 and branch_id=".$_SESSION[ 'adm_branch' ]."";
                  // $result_admin = $con->query( $query_admin );
                  // while ( $row_admin = $result_admin->fetch_object() ) {
                    ?>
                  <option value="<?php // echo $row_admin->adm_id?>"> <?php // echo $row_admin->adm_username?> </option>
                  <?php // } ?>
           </select>

          <button type="submit" class="btn">Submit</button>
          </div>
          <?php // } ?> -->
            <table id="example" class="table table-success mb30 table-hover table-bordered display" style="color:#000;" >
              <thead bgcolor="#82c21f">
                <tr>
                   <th width="5%">ID</th>
                   <th width="10%">  Date</th> 
                   <th width="10%">  Due Date</th> 
                   <th width="10%">Register No.</th>
                   <th width="10%">Name</th>
                  <th width="10%">Contact</th>
                  <th width="10%">Amount</th>
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
                 

                  <td ><?php echo $row_state->rto_id;?></td>
                   <td >
                  <?php
                  $datend = new DateTime( $row_state->rto_date );
                  echo $datend->format( 'd-m-Y' ); ?>
                  </td>
                   <td >
                  <?php
                  $datend = new DateTime( $row_state->rto_duedate );
                  echo $datend->format( 'd-m-Y' ); ?>
                  </td>
                  <td><?php echo $row_state->rto_regno;?></td>
                  <td><a title="Edit" style="color:green;" href="vahan_edit.php?rto_id=<?php echo $row_state->rto_id?>"><?php echo $row_state->rto_name;?></a></td>
                  <td><?php echo $row_state->rto_contact;?></td>
                  <td><?php echo $row_state->rto_amount." - ".$row_state->rto_credit." = ".$row_state->rto_debit;?></td>
                   <td><?php
                  if($row_state->rto_adm_id!=0) {
                    $query_asign_detail = "SELECT * FROM admin_login ld where ld.adm_id=".$row_state->rto_adm_id;
                    $asign_query = $con->query( $query_asign_detail );
                    $row_asign = $asign_query->fetch_object();
                    $asign_name = $row_asign->adm_username;
                    echo $asign_name;

                  } ?></td>
                  <td style="color: <?php if($row_state->rto_action==2 || $row_state->rto_action==3) { ?>green<?php } elseif($row_state->rto_action==1) { ?>red;<?php } ?>">
                    <?php if($row_state->rto_action==2) {
                      echo "Completed";
                    } elseif($row_state->rto_action==1) {
                      echo "Pending - ";
                      $query_rejres_detail = "SELECT * FROM pen_res_detail ld where ld.pen_res_id=".$row_state->pen_res_id;
                      $rejres_query = $con->query( $query_rejres_detail );
                      $row_rejres = $rejres_query->fetch_object();
                      $rejres_name = $row_rejres->pen_res_name;
                      echo $rejres_name;
                    } elseif($row_state->rto_action==3) {
                      echo "Document Delivered";
                    }
                    ?>
                  </td>

                  <!-- <a  title="Follow Up"style="color:#1C1B17; cursor:pointer; " onClick="return vahan_followup(<?php // echo $row_state->rto_id?>);" ><i class="fa fa-comment"></i></a> |  -->
                  <td  width="17%"><code> <a target="_blank" style="color:#333;" title="Tasks" href="vahan_task_view.php?rto_id=<?php echo $row_state->rto_id?>"><i class="fa fa-table"></i></a> | <a target="_blank" style="color:#333;" title="Documents" href="vahan_documents.php?rto_id=<?php echo $row_state->rto_id?>"><i class="fa fa-image"></i></a> | <a title="Edit" style="color:green;" href="vahan_edit.php?rto_id=<?php echo $row_state->rto_id?>"><i class="fa fa-pen"></i></a> <?php if($_SESSION['adm_type']==0) { ?>| <a title="Delete" style="color:red;" href="javascript:deleterec(<?php echo $row_state->rto_id?>)"><i class="fa fa-trash"></i></a><?php } ?> <code></td>
                </tr>
                <?php }} ?>
              </tbody>
              <tfoot>
                <tr>
                   <th width="5%" width="8%">ID</th>
                  <th width="10%">Date</th> 
                  <th width="10%">Due Date</th> 
                   <th width="10%">Register No.</th>
                   <th width="10%">Name</th>
                  <th width="10%">Contact</th>
                  <th width="10%">Amount</th>
                   <th width="10%">Assign</th>
                  <th width="10%">Status</th>
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
